audgit
======

__Note:__ *This is work in progress!* Audgit is not yet intended for use in production systems.

Audgit is a tool for system administrators to document their work. Administrators will be able to know exactly when, who, what, how *and why* configuration files was changed on systems using audgit. It specifically tracks changes made by humans, which is the most valuable information and also the main feature that differentiates audgit from other similar software.

> Audgit is for sysadmins what git is for developers.

Documentation is an important part of any production system operations, yet it is way to often inaccurate, lagging behind and neglected. This is because writing documentation is boring, laboursome and the admin who writes the documentation does not immediately get any benefit from it. On the contraty time put on updating documentation is often away from actual sysadmin work. Audgit was designed to solve this.


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
        # On branch master
        # Changes to be committed:
        #   (use "git reset HEAD <file>..." to unstage)
        #
        #	new file:   etc/hosts.deny
        $ audgit commit "Configured Nginx"
        Audgit:
        [master e68e1df] Configured Nginx
         1 file changed, 20 insertions(+)
         create mode 100644 etc/hosts.deny

Admin edits a file and commits the changeset:

        $ nano /etc/nginx/nginx.conf
        $ audgit commit "Gzip enabled"
        Audgit:
        [master 707ed42] Gzip enabled
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
*   Audgit is primarly intended to track system configuration changes made to files in the /etc/ directory, but any file can be added, e.g. from /var/spool/cron/crontabs/.

Audgit is built as a wrapper around git. This way audgit inherits all the beauty of git.

*   All audgit entries including the actual files, their metadata and the commit messages are stored in the best version control system the world has ever seen, in the location /audgit/.git/
*   All files in the working directory /audgit/ reflect their hard-linked equivalients. Any change to the system can be reverted simply by checking out to the working directory the previous version of the file. Reverts can be made for individual files or by stepping backwards complete changesets.
*   The whole history of changes can be viewed and visualized with standard git tools.
*   All changes are cryptographically linked to each other so the history is immutable. Compared with 'git push' to a remote server the history of changes can be made tamper-proof.
*   All changes can be pushed and pulled from system to system using standard git methods.
*   Standard git hooks apply. For example every change can be made to trigger an automated e-mail to the system administrators, or make a IRC or XMPP bot send out a notification.


Planned features (TODO)
-----------------------

Items from the list below will be moved up once they are implemented.

*   Implement 'audgit blame'
*   Integrate audgit with most common text editors (nano, pico, joe, vi, vim, emacs) so that when a user invokes them to edit a file in system directories (mainly /etc/) the user would be prompted Y/N if they want the file to be added to audgit, thus omitting the need for the admin to remember to manually run 'audgit add'.
*   Integrate Linux kernel system auditd with audgit to detect if non-root users write a file in system directories (mainly /etc/) the user would be prompted Y/N if they want the file to be added to audgit, thus minimizing the probability that the system has manual configuration file changes that are not tracked by audgit.
*   Integrate audgit with bash and other shell's exit commands so that running exit would warn if the admin is about to leave the system with uncommitted changes in audgit tracked files.
*   Integrate a timer into audgit so that it would remind users to run 'audgit commit' if uncommitted changes have been lying around for a while. Reminders should be sent via 'write' is user has not logged out and a shell is open, or via XMPP or e-mail if user is no longer logged in.

*   Test to work on all Debian-based Linux-distributions.
*   Test to work on all SUSE and other major Linux distributions.
*   Test to work on all Unix-based systems, including MacOS X.














