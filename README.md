audgit
======

__Note:__ *This is work in progress!* Audgit is not yet intended for use in production systems.

Audgit is a tool for system administrators to document their work. Administrators will be able to know exactly when, who, what, how *and why* configuration files was changed on systems using audgit. It specifically tracks changes made by humans, which is the most valuable information and also the main feature that differentiates audgit from other similar software.

> Audgit is for sysadmins what git is for developers.

Documentation is an important part of any production system operations, yet it is way to often inaccurate, lagging behind and neglected. This is because writing documentation is boring, laboursome and the admin who writes the documentation does not immediately get any benefit from it. On the contrary time put on updating documentation is often away from actual sysadmin work. Audgit was designed to solve this.


Typical work-flow (with 'screenshots')
--------------------------------------

Admin logs into system. The welcome message automatically shows the latest entries in audgit:

        Welcome to Ubuntu 12.04.3 LTS (GNU/Linux 3.2.0-58-generic x86_64)
          
         * Documentation:  https://help.ubuntu.com/
         
          System information as of Sat Jan 11 13:50:32 EET 2014
         
          System load:  0.11               Processes:           107
          Usage of /:   84.4% of 29.53GB   Users logged in:     0
         
        Latest 3 system changes according in Audgit:
         
         2014-01-04 21:29:39 +0200 Otto Kekäläinen
         SSH port now 18822
         etc/ssh/sshd_config |   95 +++++++++++++++++++++++++++++++++++++++++++++++++++
         1 file changed, 95 insertions(+)
         
         2014-01-07 15:16:18 +0200 Otto Kekäläinen
         Customize Postfix to listen to localhost only
         etc/nginx/sites-enabled/gometal |    7 +++++--
         etc/postfix/main.cf             |   39 +++++++++++++++++++++++++++++++++++++++
         2 files changed, 44 insertions(+), 2 deletions(-)
         
         2014-01-10 21:20:29 +0200 Otto Kekäläinen
         Fine tuned fastcgi-cache settings
         etc/fstab                          |    1 +
         etc/nginx/sites-enabled/wp-network |    6 ++++++
         etc/nginx/wordpress-cache.conf     |    4 ++++
         3 files changed, 11 insertions(+)
         
        12 packages can be updated.
        0 updates are security updates.

Admin adds a new file into audgit and commits the changeset:

        $ audgit add /etc/nginx/nginx.conf
        # On branch server01
        # Changes to be committed:
        #   (use "git reset HEAD <file>..." to unstage)
        #
        #	new file:   etc/hosts.deny
        $ audgit commit "Configured Nginx"
        Audgit:
        [server01 e68e1df] Configured Nginx
         1 file changed, 20 insertions(+)
         create mode 100644 etc/hosts.deny

Admin edits a file and commits the changeset:

        $ nano /etc/nginx/nginx.conf
        $ audgit commit "Gzip enabled"
        Audgit:
        [server01 707ed42] Gzip enabled
         1 file changed, 3 insertions(+)

Admin inspects previous changesets:

        $ audgit log
        Audgit:
        2014-01-11 13:56:27 +0200 Otto Kekäläinen
         Configured Nginx
         etc/hosts.deny |   20 ++++++++++++++++++++
         1 file changed, 20 insertions(+)

        2014-01-11 13:58:30 +0200 Otto Kekäläinen
         Gzip enabled
         etc/hosts.deny |    3 +++
         1 file changed, 3 insertions(+)
        $ audgit show -2
        (git diff of files two commits ago compared to current files)


Features
--------

The most important design goal for audgit is ease of use. A tool like this must be as easy as possible to learn and use so that sysadmins bother to commit their changes to the audgit log.

*   Running audgit without arguments will automatically show help.
*   Day-to-day workflow only requires two commands
    *   audgit add [filename]
    *   audgit commit "[message]"
*   Every time an admin logs into the system the latest entries in the audgit log is shown.
*   If other admins are logged in while an admin makes an audgit commit, they will all see the audgit entry in their shells (via wall broadcasting).
*   Audgit is primarily intended to track system configuration changes made to files in the /etc/ directory, but any file can be added, e.g. from /var/spool/cron/crontabs/.

Audgit is built as a wrapper around git. This way audgit inherits all the beauty of git.

*   All audgit entries including the actual files, their metadata and the commit messages are stored in the best version control system the world has ever seen, in the location /audgit/.git/
*   All files in the working directory /audgit/ reflect their hard-linked equivalents. Any change to the system can be reverted simply by checking out to the working directory the previous version of the file. Reverts can be made for individual files or by stepping backwards complete changesets.
*   The whole history of changes can be viewed and visualized with standard git tools.
*   All changes are cryptographically linked to each other so the history is immutable. Compared with 'git push' to a remote server the history of changes can be made tamper-proof.
*   All changes can be pushed and pulled from system to system using standard git methods.
*   Standard git hooks apply. For example every change can be made to trigger an automated e-mail to the system administrators, or make a IRC or XMPP bot send out a notification.


Planned features (TODO)
-----------------------

Items from the list below will be moved up once they are implemented.

*   Implement 'audgit reset' properly so that hard link is not lost.
*   Implement 'audgit list' properly so that warns if some file is not a hard link.
*   Implement 'audgit scan' which queries dpkg/rpm for file checksums and compares them to files on disk, thus finding files that differ from their original version and are potential targets for 'audgit add'.
    *   Debian:
        *   cruft, debsums
        *   grep -h "^/etc" /var/lib/dpkg/info/*.list> dpkg-etc-files.dat
        *   find /etc -type f -o -type l > all-usr-files.dat
        *   sort dpkg-files.dat all-usr-files.dat | uniq -c | grep " 1 "
        *   (consider also diversions and alternatives, eg. dpkg-divert --list)
    *   SUSE/CentOS:
        *   rpm -V
*   Integrate audgit with most common text editors (nano, pico, joe, vi, vim, emacs) so that when a user invokes them to edit a file in system directories (mainly /etc/) the user would be prompted Y/N if they want the file to be added to audgit, thus omitting the need for the admin to remember to manually run 'audgit add'.
*   Integrate Linux kernel system auditd with audgit to detect if non-root users write a file in system directories (mainly /etc/) the user would be prompted Y/N if they want the file to be added to audgit, thus minimizing the probability that the system has manual configuration file changes that are not tracked by audgit.
*   Integrate audgit with bash and other shell's exit commands so that running exit would warn if the admin is about to leave the system with uncommitted changes in audgit tracked files.
*   Integrate a timer into audgit so that it would remind users to run 'audgit commit' if uncommitted changes have been lying around for a while. Reminders should be sent via 'write' is user has not logged out and a shell is open, or via XMPP or e-mail if user is no longer logged in.
*   Integrate to syslog/systemd, e.g. echo via logger commits so that they are more discoverable
*   Automatically add to each commit OS information (e.g. os.platform/arch/release) and package lists (dpkg --get-selections, rpm -qa).
*   Create test suite and better command arguments validation.
*   Test to work on all Debian-based Linux-distributions.
*   Test to work on all SUSE and other major Linux distributions.
*   Test to work on all Unix-based systems, including MacOS X.


Architecture
------------

Audgit is a Node.js command line tool (written in JavaScript). This is done partially to experiment how Node.js apps work as command line tools, but partially also because a simple bash script wouldn't work for a larger piece of software with test suites, daemon modes, fast async file operations etc.

At the moment there are no external dependencies aside standard Node.js, but later will have a test framework (Mocha etc), output colourization, e-mail/XMPP-communication etc.

Audit is intended to be run in 'sudo'.

Install
-------

That the command *audgit* will be available as a global command line program after installation. Audgit depends on having packages git and npm installed first.

        sudo apt-get install git nodejs npm
        # If git was installed for the first time,
        # rember to set git config name and e-mail
        git clone https://github.com/Seravo/audgit.git
        cd audgit
        sudo npm install -g
        sudo audgit init

__Note:__ For Node.js [at least version 0.8](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) is required (due to module domain requirements).


Audgit initialization is also automatically run also on first audgit command invocation if not done explicitly earlier.

Once Audgit is installed you most likely want to run a lot of commands like `sudo audgit add /etc/a/b/c`.
