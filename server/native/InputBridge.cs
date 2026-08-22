using System;
using System.Collections.Generic;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

namespace MPad.Native
{
    class Program
    {
        [DllImport("user32.dll")]
        static extern void mouse_event(uint dwFlags, int dx, int dy, int dwData, UIntPtr dwExtraInfo);

        [DllImport("user32.dll")]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        [DllImport("user32.dll")]
        static extern short VkKeyScan(char ch);

        [DllImport("user32.dll")]
        static extern bool SetCursorPos(int X, int Y);

        const uint MOUSEEVENTF_MOVE = 0x0001;
        const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        const uint MOUSEEVENTF_LEFTUP = 0x0004;
        const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        const uint MOUSEEVENTF_RIGHTUP = 0x0010;
        const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
        const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
        const uint MOUSEEVENTF_WHEEL = 0x0800;
        const uint MOUSEEVENTF_HWHEEL = 0x01000;

        const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
        const uint KEYEVENTF_KEYUP = 0x0002;

        const byte VK_LBUTTON = 0x01;
        const byte VK_RBUTTON = 0x02;
        const byte VK_CANCEL = 0x03;
        const byte VK_MBUTTON = 0x04;
        const byte VK_BACK = 0x08;
        const byte VK_TAB = 0x09;
        const byte VK_RETURN = 0x0D;
        const byte VK_SHIFT = 0x10;
        const byte VK_CONTROL = 0x11;
        const byte VK_MENU = 0x12;
        const byte VK_PAUSE = 0x13;
        const byte VK_CAPITAL = 0x14;
        const byte VK_ESCAPE = 0x1B;
        const byte VK_SPACE = 0x20;
        const byte VK_PRIOR = 0x21;
        const byte VK_NEXT = 0x22;
        const byte VK_END = 0x23;
        const byte VK_HOME = 0x24;
        const byte VK_LEFT = 0x25;
        const byte VK_UP = 0x26;
        const byte VK_RIGHT = 0x27;
        const byte VK_DOWN = 0x28;
        const byte VK_INSERT = 0x2D;
        const byte VK_DELETE = 0x2E;
        const byte VK_LWIN = 0x5B;
        const byte VK_RWIN = 0x5C;

        const byte VK_F1 = 0x70;
        const byte VK_F2 = 0x71;
        const byte VK_F3 = 0x72;
        const byte VK_F4 = 0x73;
        const byte VK_F5 = 0x74;
        const byte VK_F6 = 0x75;
        const byte VK_F7 = 0x76;
        const byte VK_F8 = 0x77;
        const byte VK_F9 = 0x78;
        const byte VK_F10 = 0x79;
        const byte VK_F11 = 0x7A;
        const byte VK_F12 = 0x7B;

        const byte VK_VOLUME_MUTE = 0xAD;
        const byte VK_VOLUME_DOWN = 0xAE;
        const byte VK_VOLUME_UP = 0xAF;
        const byte VK_MEDIA_NEXT_TRACK = 0xB0;
        const byte VK_MEDIA_PREV_TRACK = 0xB1;
        const byte VK_MEDIA_STOP = 0xB2;
        const byte VK_MEDIA_PLAY_PAUSE = 0xB3;

        static Dictionary<string, byte> keyMap = new Dictionary<string, byte>(StringComparer.OrdinalIgnoreCase)
        {
            { "backspace", VK_BACK },
            { "bksp", VK_BACK },
            { "tab", VK_TAB },
            { "enter", VK_RETURN },
            { "return", VK_RETURN },
            { "shift", VK_SHIFT },
            { "ctrl", VK_CONTROL },
            { "control", VK_CONTROL },
            { "alt", VK_MENU },
            { "esc", VK_ESCAPE },
            { "escape", VK_ESCAPE },
            { "space", VK_SPACE },
            { "pageup", VK_PRIOR },
            { "pagedown", VK_NEXT },
            { "end", VK_END },
            { "home", VK_HOME },
            { "left", VK_LEFT },
            { "up", VK_UP },
            { "right", VK_RIGHT },
            { "down", VK_DOWN },
            { "insert", VK_INSERT },
            { "delete", VK_DELETE },
            { "win", VK_LWIN },
            { "cmd", VK_LWIN },
            { "f1", VK_F1 },
            { "f2", VK_F2 },
            { "f3", VK_F3 },
            { "f4", VK_F4 },
            { "f5", VK_F5 },
            { "f6", VK_F6 },
            { "f7", VK_F7 },
            { "f8", VK_F8 },
            { "f9", VK_F9 },
            { "f10", VK_F10 },
            { "f11", VK_F11 },
            { "f12", VK_F12 },
            { "volup", VK_VOLUME_UP },
            { "voldown", VK_VOLUME_DOWN },
            { "volmute", VK_VOLUME_MUTE },
            { "playpause", VK_MEDIA_PLAY_PAUSE },
            { "nexttrack", VK_MEDIA_NEXT_TRACK },
            { "prevtrack", VK_MEDIA_PREV_TRACK }
        };

        static void Main(string[] args)
        {
            Console.OutputEncoding = System.Text.Encoding.UTF8;
            Console.WriteLine("READY");

            string line;
            while ((line = Console.ReadLine()) != null)
            {
                line = line.Trim();
                if (string.IsNullOrEmpty(line)) continue;

                try
                {
                    string[] parts = line.Split(new[] { ' ' }, 2, StringSplitOptions.RemoveEmptyEntries);
                    string cmd = parts[0].ToUpperInvariant();
                    string arg = parts.Length > 1 ? parts[1] : "";

                    switch (cmd)
                    {
                        case "MOVE":
                            HandleMove(arg);
                            break;
                        case "MOUSEDOWN":
                            HandleMouseButton(arg, true);
                            break;
                        case "MOUSEUP":
                            HandleMouseButton(arg, false);
                            break;
                        case "CLICK":
                            HandleClick(arg);
                            break;
                        case "DBLCLICK":
                            HandleDblClick(arg);
                            break;
                        case "SCROLL":
                            HandleScroll(arg);
                            break;
                        case "TEXT":
                            HandleText(arg);
                            break;
                        case "KEY":
                            HandleKey(arg);
                            break;
                        case "SHORTCUT":
                            HandleShortcut(arg);
                            break;
                        case "MEDIA":
                            HandleMedia(arg);
                            break;
                        case "PING":
                            Console.WriteLine("PONG " + arg);
                            break;
                        case "EXIT":
                            return;
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine("ERR: " + ex.Message);
                }
            }
        }

        static void HandleMove(string arg)
        {
            string[] coords = arg.Split(' ');
            if (coords.Length >= 2)
            {
                int dx = (int)Math.Round(float.Parse(coords[0], System.Globalization.CultureInfo.InvariantCulture));
                int dy = (int)Math.Round(float.Parse(coords[1], System.Globalization.CultureInfo.InvariantCulture));
                
                try
                {
                    Point cur = Cursor.Position;
                    Cursor.Position = new Point(cur.X + dx, cur.Y + dy);
                }
                catch
                {
                    mouse_event(MOUSEEVENTF_MOVE, dx, dy, 0, UIntPtr.Zero);
                }
            }
        }

        static void HandleMouseButton(string arg, bool down)
        {
            int button = 1;
            int.TryParse(arg, out button);

            uint flag = 0;
            if (button == 1)
                flag = down ? MOUSEEVENTF_LEFTDOWN : MOUSEEVENTF_LEFTUP;
            else if (button == 2)
                flag = down ? MOUSEEVENTF_RIGHTDOWN : MOUSEEVENTF_RIGHTUP;
            else if (button == 3)
                flag = down ? MOUSEEVENTF_MIDDLEDOWN : MOUSEEVENTF_MIDDLEUP;

            if (flag != 0)
            {
                mouse_event(flag, 0, 0, 0, UIntPtr.Zero);
            }
        }

        static void HandleClick(string arg)
        {
            HandleMouseButton(arg, true);
            Thread.Sleep(8);
            HandleMouseButton(arg, false);
        }

        static void HandleDblClick(string arg)
        {
            HandleClick(arg);
            Thread.Sleep(60);
            HandleClick(arg);
        }

        static void HandleScroll(string arg)
        {
            string[] parts = arg.Split(' ');
            if (parts.Length >= 1)
            {
                int dy = (int)Math.Round(float.Parse(parts[0], System.Globalization.CultureInfo.InvariantCulture));
                if (dy != 0)
                {
                    mouse_event(MOUSEEVENTF_WHEEL, 0, 0, dy, UIntPtr.Zero);
                }

                if (parts.Length >= 2)
                {
                    int dx = (int)Math.Round(float.Parse(parts[1], System.Globalization.CultureInfo.InvariantCulture));
                    if (dx != 0)
                    {
                        mouse_event(MOUSEEVENTF_HWHEEL, 0, 0, dx, UIntPtr.Zero);
                    }
                }
            }
        }

        static void HandleText(string text)
        {
            if (string.IsNullOrEmpty(text)) return;

            foreach (char c in text)
            {
                short vk = VkKeyScan(c);
                if (vk != -1)
                {
                    byte virtualKey = (byte)(vk & 0xff);
                    byte shiftState = (byte)((vk >> 8) & 0xff);

                    if ((shiftState & 1) != 0)
                        keybd_event(VK_SHIFT, 0, 0, UIntPtr.Zero);

                    keybd_event(virtualKey, 0, 0, UIntPtr.Zero);
                    keybd_event(virtualKey, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);

                    if ((shiftState & 1) != 0)
                        keybd_event(VK_SHIFT, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                }
            }
        }

        static byte ParseKey(string name)
        {
            name = name.Trim();
            byte vk = 0;
            if (keyMap.TryGetValue(name, out vk))
            {
                return vk;
            }

            if (name.Length == 1)
            {
                char c = char.ToUpperInvariant(name[0]);
                if (c >= 'A' && c <= 'Z') return (byte)c;
                if (c >= '0' && c <= '9') return (byte)c;
            }

            return 0;
        }

        static void HandleKey(string arg)
        {
            byte vk = ParseKey(arg);
            if (vk != 0)
            {
                SendKey(vk, false);
                Thread.Sleep(5);
                SendKey(vk, true);
            }
        }

        static void HandleShortcut(string arg)
        {
            string[] keys = arg.Split(new[] { '+', '-' }, StringSplitOptions.RemoveEmptyEntries);
            List<byte> vks = new List<byte>();

            foreach (var k in keys)
            {
                byte vk = ParseKey(k);
                if (vk != 0)
                {
                    vks.Add(vk);
                }
            }

            if (vks.Count == 0) return;

            foreach (var vk in vks)
            {
                SendKey(vk, false);
            }

            Thread.Sleep(20);

            for (int i = vks.Count - 1; i >= 0; i--)
            {
                SendKey(vks[i], true);
            }
        }

        static void HandleMedia(string action)
        {
            action = action.ToLowerInvariant();
            byte vk = 0;
            switch (action)
            {
                case "volume_up":
                case "volup":
                    vk = VK_VOLUME_UP;
                    break;
                case "volume_down":
                case "voldown":
                    vk = VK_VOLUME_DOWN;
                    break;
                case "mute":
                case "volmute":
                    vk = VK_VOLUME_MUTE;
                    break;
                case "play_pause":
                case "playpause":
                    vk = VK_MEDIA_PLAY_PAUSE;
                    break;
                case "next":
                case "nexttrack":
                    vk = VK_MEDIA_NEXT_TRACK;
                    break;
                case "prev":
                case "prevtrack":
                    vk = VK_MEDIA_PREV_TRACK;
                    break;
            }

            if (vk != 0)
            {
                SendKey(vk, false);
                Thread.Sleep(5);
                SendKey(vk, true);
            }
        }

        static void SendKey(byte vk, bool isKeyUp)
        {
            uint flags = isKeyUp ? KEYEVENTF_KEYUP : 0;
            if (vk == VK_LEFT || vk == VK_UP || vk == VK_RIGHT || vk == VK_DOWN ||
                vk == VK_INSERT || vk == VK_DELETE || vk == VK_HOME || vk == VK_END ||
                vk == VK_PRIOR || vk == VK_NEXT || vk == VK_LWIN || vk == VK_RWIN)
            {
                flags |= KEYEVENTF_EXTENDEDKEY;
            }

            keybd_event(vk, 0, flags, UIntPtr.Zero);
        }
    }
}
