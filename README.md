# 💬 Chaturbate Chat Utils
This is a script meant for [Tampermonkey](https://www.tampermonkey.net/) (or any compatible extension).
It allows filtering or graying out non-user messages (e.g. tip menus, join notifications, follow notices...)
and adding timestamps to messages in real time.

This script should (_should_) get autoupdated from this repository,
if you have enabled automatic updates.

---

## Settings and usage
![](git-assets/cbutils.png)


The script adds a "chat balloon" to room pages.
It can be dragged around the window to prevent obstructing anything below it.
By clicking on the "balloon", a simple dialog of options is presented.

### Gray out non-user messages
This will gray out (change the opacity and set filter to grayscale(100%)) on any messages that aren't related to a user (e.g. notices). Useful if you want to still see tip menus and notices, but keep your focus on chat messages (especially useful for models and mods!)

### Enable chat filtering
This will hide the messages mentioned above. Useful if you want to hide tip menus and useless notices from the chat completely to only see tips and chat messages (there is also a rule for basic tip menu item parsing, which allows messages containing the words "tipped for").

### Enable timestamps
This will prepend basic HH:MM:SS timestamps to all messages and notices. Useful if you go AFK and want to see when a message was written to the chat. (Only works when you are in the room)

### Enable scroll fix
This will just brutely scroll the chat box to the bottom whenever a new message is appended, to fix scroll lag caused by timestamps and other added stuff.

---

## License
This script is licensed under the MIT license.
Even though this script is mainly meant for my personal use,
feel free to fork or send pull requests for fun or useful additions.
