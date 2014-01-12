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
    '   audgit log\n',
    '   audgit show -2\n',
    '   audgit list\n',
    '   audgit blame /etc/sshd_config\n'
  );
}

function showError(msg, value) {
  if (value === undefined) { var value = ''; }
  console.log('ERROR:', msg, value);
  showUsage();
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
     'show', 'list', 'blame', 'reset'].indexOf(argv[0]) === -1) {
  showError('Not a valid action:', argv[0]);
} else {
  if (['add', 'rm', 'commit', 'blame'].indexOf(argv[0]) != -1 && argv.length != 2) {
    showError('Incorrect arguments for action:', argv[0]);
  } else if (['status', 'log', 'list', 'reset'].indexOf(argv[0]) != -1 && argv.length != 1) {
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

// TODO: major bug, reset deletes the hard link an replaces it with a non-linked file

// TODO: check that /audgit exists or create it (error code ENOENT)
// TODO: check that /audgit/.git exists or init it (error code ENOENT)
// TODO: check for permissions to /audgit (error code EACCES)
// TODO: write tests for all of these cases

// console.dir(argv);


// Add to git repo via hard links
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


/*
 * Spawn git in child process
 * Run in separate domain to catch errors
 */

var d = domain.create();

d.on('error', function(err) {
  if (err && err.code == 'ENOENT') {
    showError('Check that directory /audgit/ exists');
  } else {
    console.error(err);
  }
});

// Clean up any trailing slashes to avoid Git from complaining
// that the file is outside the git repository
if (argv[1] && argv[1].substr(0, 1) == '/') {
  argv[1] = argv[1].substr(1);
}

d.run(function() {

  var git = spawn(
    'git',
    argv,
    {cwd: '/audgit', env: process.env}
  );

  git.stdout.on('data', onStdout);
  git.stderr.on('data', onStderr);
  git.on('close', onExit);

  if (['add', 'rm', 'reset'].indexOf(argv[0]) != -1) {
    // re-run to show status
    spawn('git', ['status'], {cwd: '/audgit', env: process.env, stdio: 'inherit'});
  }
});


/*
 * Child process helper functions
 */
function onStdout (data) {
  console.log('Audgit:');
  if (argv[0] == 'ls-files') {
    console.log('H=OK, C=Changed, ?=Unknown file\n');
  }
  console.log(data.toString());
}

function onStderr (data) {
  console.log('Audgit:\n' + data);
}

function onExit (code) {
  if (code > 0) {
    showError('Child process exited with code', code);
  }
}
