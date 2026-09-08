# Creates a desktop shortcut that launches mPad without a terminal window.
# Run once:  npm run setup

$ErrorActionPreference = 'Stop'

$root      = Split-Path -Parent $PSScriptRoot
$vbsPath   = Join-Path $root 'launch-mpad.vbs'
$assetsDir = Join-Path $root 'assets'
$iconPath  = Join-Path $assetsDir 'mpad.ico'

if (-not (Test-Path $vbsPath)) {
    throw "Launcher not found at $vbsPath"
}

# --- Icon -----------------------------------------------------------------
# Drawn programmatically so the repository needs no binary asset.

function New-MpadIcon {
    param([string]$OutputPath)

    Add-Type -AssemblyName System.Drawing

    # Classic DIB frames (not PNG frames): decoded by GDI+ and Explorer alike.
    $sizes  = @(16, 32, 48, 64, 128)
    $frames = @()

    foreach ($size in $sizes) {
        $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g   = [System.Drawing.Graphics]::FromImage($bmp)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

        # Rounded indigo tile
        $radius = [int]($size * 0.22)
        $d      = [Math]::Max(2, $radius * 2)
        $max    = $size - 1
        $path   = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddArc(0, 0, $d, $d, 180, 90)
        $path.AddArc($max - $d, 0, $d, $d, 270, 90)
        $path.AddArc($max - $d, $max - $d, $d, $d, 0, 90)
        $path.AddArc(0, $max - $d, $d, $d, 90, 90)
        $path.CloseFigure()

        $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            (New-Object System.Drawing.Point(0, 0)),
            (New-Object System.Drawing.Point($size, $size)),
            [System.Drawing.Color]::FromArgb(255, 99, 102, 241),
            [System.Drawing.Color]::FromArgb(255, 56, 40, 158))
        $g.FillPath($brush, $path)

        # Phone outline
        $penWidth = [Math]::Max(1.0, $size * 0.05)
        $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, $penWidth)
        $pw  = [int]($size * 0.34)
        $ph  = [int]($size * 0.52)
        $px  = [int](($size - $pw) / 2)
        $py  = [int](($size - $ph) / 2)
        $pr  = [Math]::Max(2, [int]($size * 0.07) * 2)
        $phone = New-Object System.Drawing.Drawing2D.GraphicsPath
        $phone.AddArc($px, $py, $pr, $pr, 180, 90)
        $phone.AddArc($px + $pw - $pr, $py, $pr, $pr, 270, 90)
        $phone.AddArc($px + $pw - $pr, $py + $ph - $pr, $pr, $pr, 0, 90)
        $phone.AddArc($px, $py + $ph - $pr, $pr, $pr, 90, 90)
        $phone.CloseFigure()
        $g.DrawPath($pen, $phone)

        # Cursor dot inside the phone
        $dot = [Math]::Max(2, [int]($size * 0.12))
        $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        $g.FillEllipse($white, [int]($px + $pw / 2 - $dot / 2), [int]($py + $ph * 0.52), $dot, $dot)

        # --- Bitmap -> DIB bytes (BGRA, bottom-up, plus empty AND mask) ---
        $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
        $data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
                              [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $stride = [Math]::Abs($data.Stride)
        $pixels = New-Object byte[] ($stride * $size)
        [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $pixels, 0, $pixels.Length)
        $bmp.UnlockBits($data)

        $maskStride = [int]([Math]::Floor(($size + 31) / 32)) * 4
        $dib = New-Object System.IO.MemoryStream
        $w   = New-Object System.IO.BinaryWriter($dib)

        $w.Write([UInt32]40)          # biSize
        $w.Write([Int32]$size)        # biWidth
        $w.Write([Int32]($size * 2))  # biHeight: XOR image + AND mask
        $w.Write([UInt16]1)           # biPlanes
        $w.Write([UInt16]32)          # biBitCount
        $w.Write([UInt32]0)           # biCompression: BI_RGB
        $w.Write([UInt32]($size * $size * 4 + $maskStride * $size))
        $w.Write([Int32]0); $w.Write([Int32]0)   # pixels-per-meter
        $w.Write([UInt32]0); $w.Write([UInt32]0) # palette

        for ($y = $size - 1; $y -ge 0; $y--) {
            $w.Write($pixels, $y * $stride, $size * 4)
        }
        $w.Write((New-Object byte[] ($maskStride * $size)))   # AND mask: alpha does the work

        $w.Flush()
        $frames += ,@($size, $dib.ToArray())

        $w.Dispose(); $dib.Dispose(); $white.Dispose(); $pen.Dispose()
        $phone.Dispose(); $brush.Dispose(); $path.Dispose(); $g.Dispose(); $bmp.Dispose()
    }

    # --- ICO container ---
    $out    = New-Object System.IO.MemoryStream
    $writer = New-Object System.IO.BinaryWriter($out)
    $writer.Write([UInt16]0)                # reserved
    $writer.Write([UInt16]1)                # type: icon
    $writer.Write([UInt16]$frames.Count)

    $offset = 6 + (16 * $frames.Count)
    foreach ($frame in $frames) {
        $size = $frame[0]
        $data = $frame[1]
        if ($size -ge 256) { $dim = [Byte]0 } else { $dim = [Byte]$size }
        $writer.Write($dim)                 # width
        $writer.Write($dim)                 # height
        $writer.Write([Byte]0)              # palette size
        $writer.Write([Byte]0)              # reserved
        $writer.Write([UInt16]1)            # color planes
        $writer.Write([UInt16]32)           # bits per pixel
        $writer.Write([UInt32]$data.Length)
        $writer.Write([UInt32]$offset)
        $offset += $data.Length
    }
    foreach ($frame in $frames) { $writer.Write($frame[1]) }

    $writer.Flush()
    [System.IO.File]::WriteAllBytes($OutputPath, $out.ToArray())
    $writer.Dispose(); $out.Dispose()
}

if (-not (Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir | Out-Null }
New-MpadIcon -OutputPath $iconPath

# --- Shortcut -------------------------------------------------------------

$desktop      = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'mPad.lnk'

$shell    = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath       = Join-Path $env:SystemRoot 'System32\wscript.exe'
$shortcut.Arguments        = '"{0}"' -f $vbsPath
$shortcut.WorkingDirectory = $root
$shortcut.IconLocation     = '{0},0' -f $iconPath
$shortcut.Description      = 'Start mPad and show the QR code to connect your phone'
$shortcut.Save()

Write-Host "Desktop shortcut created: $shortcutPath"
Write-Host "Double-click 'mPad' on your desktop to start. No terminal needed."
