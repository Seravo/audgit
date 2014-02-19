/*
 * Read showUsage() for instructions
 */

'use strict';

function showUsage() {
  // TODO: colorize output to make error messages and help text more distinguishable
  console.log('\n' +
    ' A tool for system administrators to document their work.\n' +
    '\n' +
    ' When audgit is active all manually edited configuration files will\n' +
    ' be hard linked in a git repository located in /audgit/\n' +
    ' Interaction with this repo is automated with this git wrapper tool.\n' +
    '\n' +
    ' Typical work-flow:\n' +
    '   audgit add /etc/nginx/nginx.conf\n' +
    '   audgit commit -am "Configured Nginx"\n' +
    '   nano /etc/nginx/nginx.conf\n' +
    '   audgit commit "Gzip enabled"\n' +
    '   audgit list\n' +
    '\n' +
    ' Additional examples:\n' +
    '   audgit log\n' +
    '   audgit show -2\n' +
    '   audgit blame /etc/sshd_config\n'
//    '  audgit reset\n'
  );
}

function showError(msg, value, skipUsage) {
  if (value === undefined) { var value = ''; }
  console.log('ERROR:', msg, value);
  if (!skipUsage) {
    showUsage();
  }
  process.exit(1); // exit with error
}

var fs = require('fs');
var domain = require('domain');
var spawn = require('child_process').spawn;


/*
 * Check that audgit was invoked correctly
 */

if (process.argv.length < 3) {
  showError('No arguments given.');
} else {
  var argv = process.argv.splice(2);
}

// Only allow these basic operations and their argument counts
if (['add', 'rm', 'commit', 'status', 'log',
     'show', 'list', 'blame', 'reset', 'init'].indexOf(argv[0]) === -1) {
  showError('Not a valid action:', argv[0]);
} else {
  if (['add', 'rm', 'commit', 'blame'].indexOf(argv[0]) != -1 && argv.length != 2) {
    showError('Incorrect arguments for action:', argv[0]);
  } else if (['status', 'log', 'list', 'reset', 'init'].indexOf(argv[0]) != -1 && argv.length != 1) {
    showError('Incorrect arguments for action:', argv[0]);
  } else if (['show'].indexOf(argv[0]) != -1 && argv.length > 2) {
    showError('Incorrect arguments for action:', argv[0]);
  }
}

// Automatically insert commit parameters
if (argv[0] == 'commit') {
  argv[2] = argv[1];
  argv[1] = '-am';
} else if (argv[0] == 'log') {
  argv = 'log -n 3 --date-order --reverse --stat'.split(' ');
  argv.push('--pretty=format:%ai %an%n %s');
} else if (argv[0] == 'list') {
  argv = 'ls-files -t -cdmok'.split(' ');
} else if (argv[0] == 'reset') {
  argv[1] = '--hard';
}

// TODO: BUG: reset deletes the hard link an replaces it with a non-linked file
// TODO: check for permissions to /audgit (error code EACCES)

// console.dir(argv);


// Make sure user has configured user.name
var gitUserName = spawn('git', ['config', '--global', 'user.name'], {env: process.env});
gitUserName.stdout.on('data', function(data) {
  gitUserName.result = data;
});
gitUserName.on('close', function(data) {
  if (gitUserName.result == undefined) {
    showError('"git config --global user.name" must be defined to use Audgit!"', '', true);
  }
});

// Make sure user has configured user.email
var gitUserEmail = spawn('git', ['config', '--global', 'user.email'], {env: process.env});
gitUserEmail.stdout.on('data', function(data) {
  gitUserEmail.result = data;
});
gitUserEmail.on('close', function(data) {
  if (gitUserEmail.result == undefined) {
    showError('"git config --global user.email" must be defined to use Audgit!"', '', true);
  }
});



// Make sure that the Audigt repository is created and initialized
// for all commands, and output results it 'init' was the command
if (argv[0] == 'init') {
  audgitInit({'explicit': true});
} else {
  audgitInit();
}


// If command is 'add' prepare it by hard linking the file to a path under
// the Audgit repository.
if (argv[0] == 'add' && argv[1]) {
  // later use fs.realpathSync to make sure file has absolute path
  try {
    var stats = fs.lstatSync(argv[1]);
  } catch (err) {
    if (err.code == 'ENOENT') {
      showError('No such file:', argv[1]);
    } else {
      throw err;
    }
  }
  var filepath = argv[1].split('/').splice(1);

  if (stats.isFile()) {

    // Create directories in path
    var base = '/audgit';
    for (var i = 0; i < (filepath.length - 1); i++) {
      base += '/' + filepath[i];
      try {
        fs.mkdirSync(base);
      } catch (err) {
        if (err.code != 'EEXIST') { throw err; }
      }
    }

    // Create hard link (git would ignore contents of symbolic link targets)
    try {
      fs.linkSync(argv[1], '/audgit' + argv[1]);
    } catch (err) {
      if (err.code != 'EEXIST') { throw err; }
    }

    //debug: console.log('yes file');
/*
  } else if (stats.isDirectory()) {
    fs.mkdirSync(argv[1]);
    // for each file in directory iterate:
    //    fs.linkSync('/audgit/' + argv[1], argv[1]);
*/
  } else {
    // at the moment each file must be added individually
    showError('Not a valid file:', argv[1]);
  }
}


// Clean up any preceeding slashes to avoid Git from complaining
// that the file is outside the git repository
if (argv[1] && argv[1].substr(0, 1) == '/') {
  argv[1] = argv[1].substr(1);
}


/*
 * Run in separate domain to catch errors
 */

var d = domain.create();

d.on('error', function(err) {
  if (err && err.code == 'ENOENT') {
    showError('The Audgit directory does not exists. Run "audgit init".', '', true);
  } else {
    console.error(err);
  }
});


/*
 * Main command is executed here by passing the command on to Git
 * But execute it only command is not 'init' and previous init is OK
 */
if (argv[0] != 'init' && audgitInit()) {
  d.run(function() {

    // Prepare spawn to run Git in child process
    var git = spawn(
      'git',
      argv,
      {cwd: '/audgit', env: process.env}
    );

    git.stdout.on('data', onStdout);
    git.stderr.on('data', onStderr);
    git.on('close', onExit);

  });
}

/*
 * Run additional commands after main command if needed
 */
if (['add', 'rm', 'reset'].indexOf(argv[0]) != -1) {
  // re-run to show status
  spawn('git', ['status'], {cwd: '/audgit', env: process.env, stdio: 'inherit'});
}



/*
 * Generic init function that is run on all Audgit commands
 */
function audgitInit(args) {

  if (args == undefined) {
    var args = {};
  }

  // Make sure directory /audgit exists
  try {
    var audgitPath = fs.lstatSync('/audgit');
  } catch (err) {
    if (err.code != 'ENOENT') {
      throw err;
    } else {
      fs.mkdirSync('/audgit');
    }
  }

  if (audgitPath && audgitPath.isDirectory() === false) {
    showError('Current /audgit is not a directory. Remove it and try again.');
  }

  // Make sure git repository in /audgit exists
  try {
    var audgitRepoPath = fs.lstatSync('/audgit/.git');
  } catch (err) {
    if (err.code != 'ENOENT') {
      throw err;
    } else {

      // Audgit repository has not been created. Creating it now..

      // Prepare spawn to run Git in child process
      var gitInit = spawn(
        'git',
        ['init'],
        {cwd: '/audgit', env: process.env}
      );

      gitInit.stdout.on('data', onStdout);
      gitInit.stderr.on('data', onStderr);
      gitInit.on('close', function(code) {
        if (code == 0) {
          // 0 is OK
          audgitInitPopulate();
        } else {
          showError('Child process exited with code', code);
        }
      });

    }
  }

  if (audgitPath && audgitPath.isDirectory()) {
    if (args.explicit) {
      showError('Audgit repository was already created', '', true);
    }
  } else if (audgitPath) {
    showError('Current /audgit/.git is not a directory. Remove it and try again.');
  }

  return true;
}

/*
 * Populate new Audgit repository with basic data
 */
function audgitInitPopulate() {
  // rename master branch to hostname
  var os = require('os');
  spawn('git', ['checkout', '-b', os.hostname()], {cwd: '/audgit', env: process.env, stdio: 'inherit'});

  // TODO: do an initial commit with basic OS info (platform, release) and installed packages list
  var dpkgGetSelections = spawn('dpkg', ['--get-selections'], {cwd: '/audgit', env: process.env});

  dpkgGetSelections.stdout.on('data', function(data) {
    fs.appendFile('/audgit/dpkg-selections', data, function(err) {
      if (err) {
        throw err;
      }
    });
  });

  dpkgGetSelections.on('close', function(data) {
    var gitAdd = spawn('git', ['add', '--all', '/audgit'], {cwd: '/audgit', env: process.env, stdio: 'inherit'});
    gitAdd.on('close', function(data) {
      spawn('git', ['commit', '-am', '"First commit with package list"'], {cwd: '/audgit', env: process.env, stdio: 'inherit'});
    });
  });

  // Copy git hook
  copyFile('scripts/post-commit', '/audgit/.git/hooks/post-commit', function(err) {
    if (err) {
      throw err;
    } else {
      fs.chmodSync('/audgit/.git/hooks/post-commit', '755');
    }
  });

  // Copy MOTD script if system supports it
  // TODO: try just making symbolic links instead of copying
  try {
    var motdpath = fs.lstatSync('/etc/update-motd.d');
  } catch (err) {
    if (err.code != 'ENOENT') {
      throw err;
    }
  }
  if (motdpath && motdpath.isDirectory()) {
    copyFile('scripts/80-audgit', '/etc/update-motd.d/80-audgit', function(err) {
      if (err) { throw err; }
    });
    fs.chmodSync('/etc/update-motd.d/80-audgit', '755');
  }
}



/*
 * Child process helper functions
 */
function onStdout(data) {
  console.log('Audgit:');
  if (argv[0] == 'ls-files') {
    console.log('H=OK, C=Changed, ?=Unknown, R=Removed\n');
  }
  console.log(data.toString());
}

function onStderr(data) {
  console.log('Audgit:\n' + data);
}

function onExit(code) {
  if (code == 0) {
    // 0 is OK
  } else if (code == 128) {
    showError('The Audgit repository does not exist. Run "audgit init".', '', true);
  } else {
    showError('Child process exited with code', code);
  }
}

function copyFile(source, target, cb) {
  var cbCalled = false;

  var rd = fs.createReadStream(source);
  rd.on("error", function(err) {
    done(err);
  });
  var wr = fs.createWriteStream(target);
  wr.on("error", function(err) {
    done(err);
  });
  wr.on("close", function(ex) {
    done();
  });
  rd.pipe(wr);

  function done(err) {
    if (!cbCalled) {
      cb(err);
      cbCalled = true;
    }
  }
}
