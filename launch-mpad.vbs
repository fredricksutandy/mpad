' mPad launcher - starts the server with no console window, then opens the
' host page (QR code) in the default browser. Bound to the desktop shortcut
' created by scripts\create-shortcut.ps1.

Option Explicit

Dim fso, shell, scriptDir, serverJs, logFile, url, cmdLine, i

Const PORT = 8765

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
serverJs = fso.BuildPath(scriptDir, "dist-server\index.js")
logFile = fso.BuildPath(scriptDir, "mpad.log")
url = "http://localhost:" & PORT & "/host"

If Not fso.FileExists(serverJs) Then
  MsgBox "mPad has not been built yet." & vbCrLf & vbCrLf & _
         "Open a terminal in:" & vbCrLf & scriptDir & vbCrLf & vbCrLf & _
         "and run:   npm run setup", vbExclamation, "mPad"
  WScript.Quit 1
End If

' The server resolves the client folder from the current directory.
shell.CurrentDirectory = scriptDir

' Already running? Reuse it instead of starting a second instance.
If Not ServerIsUp(url) Then
  cmdLine = "cmd /c node """ & serverJs & """ > """ & logFile & """ 2>&1"
  shell.Run cmdLine, 0, False

  For i = 1 To 30
    WScript.Sleep 400
    If ServerIsUp(url) Then Exit For
  Next

  If Not ServerIsUp(url) Then
    MsgBox "mPad could not start." & vbCrLf & vbCrLf & _
           "Check the log for details:" & vbCrLf & logFile & vbCrLf & vbCrLf & _
           "Most common cause: Node.js is not installed or not on PATH.", _
           vbCritical, "mPad"
    WScript.Quit 1
  End If
End If

shell.Run url, 1, False

Function ServerIsUp(checkUrl)
  Dim http, ok
  ok = False
  On Error Resume Next
  ' ServerXMLHTTP with setProxy 1 talks to localhost directly. WinINet-based
  ' XMLHTTP would route through a system proxy and could report a false 200.
  Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  http.setProxy 1
  http.setTimeouts 1000, 1000, 2000, 3000
  http.Open "GET", checkUrl, False
  http.Send
  If Err.Number = 0 Then
    If http.Status = 200 Then ok = True
  End If
  Err.Clear
  On Error GoTo 0
  ServerIsUp = ok
End Function
