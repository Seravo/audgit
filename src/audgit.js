/*
 * The program must be run with at least one parameter and at least one value
 * e.g. audgit add /etc/hosts
 *
 * Assumptions:
 *  - first argument command
 *  - second argument file with absolute path
 */

'use strict';

var fs = require('fs');
var domain = require('domain');
var spawn = require('child_process').spawn;

/*
 * Check that audgit was invoked correctly
 */

if (process.argv.length < 3) {
  console.log('Usage: .... ');
  process.exit(1); // exit with error
} else {
  var argv = process.argv.splice(2);
}

// Only allow these basic operations
if (['add', 'rm', 'status', 'commit'].indexOf(argv[0]) === -1) {
  console.log('Not valid action:', argv[0]);
  process.exit(1); // exit with error
}

// TODO: check that /audgit exists or create it (error code ENOENT)
// TODO: check that /audgit/.git exists or init it (error code ENOENT)
// TODO: check for permissions to /audgit (error code EACCES)

// console.dir(argv);


// Add to git repo via hard links
if (argv[0] == 'add' && argv[1]) {
  // later use fs.realpathSync to make sure file has absolute path
  try {
    var stats = fs.lstatSync(argv[1]);
  } catch (err) {
    if (err.code == 'ENOENT') {
      console.log('No such file:', argv[0]);
      process.exit(1); // exit with error
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

    console.log('yes file');
/*
  } else if (stats.isDirectory()) {
    fs.mkdirSync(argv[1]);
    // for each file in directory iterate:
    //    fs.linkSync('/audgit/' + argv[1], argv[1]);
*/
  } else {
    // at the moment each file must be added individually
    console.log('Error: not a valid file: ' + argv[1]);
    process.exit(1); // exit with error
  }
}


/*
 * Spawn git in child process
 * Run in separate domain to catch errors
 */

var d = domain.create();

d.on('error', function(err) {
  if (err && err.code == 'ENOENT') {
    console.log('Error: Check that directory /audgit/ exists');
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

  if (argv[0] == 'add') {
    // re-run to show status
    spawn('git', ['status'], {cwd: '/audgit', env: process.env, stdio: 'inherit'});
  }
});


/*
 * Child process helper functions
 */
function onStdout (data) {
  console.log('\n' + data);
}

function onStderr (data) {
  console.log('\n' + data);
}

function onExit (code) {
  if (code > 0) {
    console.log('Child process exited with code ' + code);
  }
}
