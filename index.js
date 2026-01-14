#!/usr/bin/env node

/**
 * LWS Server CLI
 * Minimal Linked Web Storage server
 */

import { createServer } from './lib/server.js';
import chalk from 'chalk';

// Parse CLI arguments
const args = process.argv.slice(2);
const options = {
  port: 3126,
  host: '0.0.0.0',
  root: './data',
  logger: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--port' || arg === '-p') {
    options.port = parseInt(args[++i], 10);
  } else if (arg === '--host' || arg === '-h') {
    options.host = args[++i];
  } else if (arg === '--root' || arg === '-r') {
    options.root = args[++i];
  } else if (arg === '--quiet' || arg === '-q') {
    options.logger = false;
  } else if (arg === '--verbose' || arg === '-v') {
    options.logger = true;
  } else if (arg === '--help') {
    console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════╗
║                       LWS Server - Help                           ║
╚═══════════════════════════════════════════════════════════════════╝
`));
    console.log(chalk.white('Usage:'));
    console.log(chalk.yellow('  lws-server') + chalk.dim(' [options]\n'));
    console.log(chalk.white('Options:'));
    console.log(chalk.green('  -p, --port ') + chalk.yellow('<number>') + chalk.dim('     Port to listen on (default: 3126)'));
    console.log(chalk.green('  -h, --host ') + chalk.yellow('<address>') + chalk.dim('    Host to bind to (default: 0.0.0.0)'));
    console.log(chalk.green('  -r, --root ') + chalk.yellow('<path>') + chalk.dim('       Data directory (default: ./data)'));
    console.log(chalk.green('  -v, --verbose') + chalk.dim('           Enable detailed logging'));
    console.log(chalk.green('  -q, --quiet') + chalk.dim('             Minimal output'));
    console.log(chalk.green('  --help') + chalk.dim('                  Show this help message\n'));
    console.log(chalk.white('Examples:'));
    console.log(chalk.dim('  lws-server'));
    console.log(chalk.dim('  lws-server --port 8080 --root /var/data'));
    console.log(chalk.dim('  lws-server --verbose\n'));
    console.log(chalk.white('Environment Variables:'));
    console.log(chalk.yellow('  DATA_ROOT') + chalk.dim('              Data directory path\n'));
    console.log(chalk.white('Resources:'));
    console.log(chalk.blue('  https://github.com/linkedwebstorage/lws-server'));
    console.log(chalk.blue('  https://github.com/w3c/lws-protocol\n'));
    process.exit(0);
  } else {
    console.error(chalk.red(`✗ Unknown option: ${arg}`));
    console.error(chalk.dim('Use --help for usage information'));
    process.exit(1);
  }
}

// Create and start server
const server = createServer(options);

await server.start();

// Display startup banner
console.log(chalk.cyan(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║        ${chalk.bold.white('██╗     ██╗    ██╗███████╗    ███████╗███████╗██████╗ ██╗   ██╗')}       ║
║        ${chalk.bold.white('██║     ██║    ██║██╔════╝    ██╔════╝██╔════╝██╔══██╗██║   ██║')}       ║
║        ${chalk.bold.white('██║     ██║ █╗ ██║███████╗    ███████╗█████╗  ██████╔╝██║   ██║')}       ║
║        ${chalk.bold.white('██║     ██║███╗██║╚════██║    ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝')}       ║
║        ${chalk.bold.white('███████╗╚███╔███╔╝███████║    ███████║███████╗██║  ██║ ╚████╔╝ ')}       ║
║        ${chalk.bold.white('╚══════╝ ╚══╝╚══╝ ╚══════╝    ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ')}       ║
║                                                                   ║
║              ${chalk.bold.yellow('Linked Web Storage Protocol Server')}                  ║
║                 ${chalk.dim('W3C-compliant REST storage API')}                     ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`));

console.log(chalk.green('✓ Server started successfully\n'));

console.log(chalk.bold.white('📡 Server Configuration:\n'));
console.log(chalk.cyan('   ├─ ') + chalk.white('URL:       ') + chalk.bold.green(`http://${options.host === '0.0.0.0' ? 'localhost' : options.host}:${options.port}`));
console.log(chalk.cyan('   ├─ ') + chalk.white('Port:      ') + chalk.yellow(options.port));
console.log(chalk.cyan('   ├─ ') + chalk.white('Host:      ') + chalk.yellow(options.host));
console.log(chalk.cyan('   └─ ') + chalk.white('Data Root: ') + chalk.yellow(options.root));

console.log('\n' + chalk.bold.white('🔗 API Endpoints:\n'));
console.log(chalk.cyan('   ├─ ') + chalk.green('GET    ') + chalk.dim('/path/to/resource') + chalk.dim.italic('  (retrieve)'));
console.log(chalk.cyan('   ├─ ') + chalk.green('PUT    ') + chalk.dim('/path/to/resource') + chalk.dim.italic('  (create/update)'));
console.log(chalk.cyan('   ├─ ') + chalk.green('POST   ') + chalk.dim('/container/') + chalk.dim.italic('        (create with slug)'));
console.log(chalk.cyan('   ├─ ') + chalk.green('DELETE ') + chalk.dim('/path/to/resource') + chalk.dim.italic('  (remove)'));
console.log(chalk.cyan('   ├─ ') + chalk.green('HEAD   ') + chalk.dim('/path/to/resource') + chalk.dim.italic('  (metadata)'));
console.log(chalk.cyan('   └─ ') + chalk.green('OPTIONS') + chalk.dim('/path/to/resource') + chalk.dim.italic('  (CORS)'));

console.log('\n' + chalk.bold.white('📚 Resources:\n'));
console.log(chalk.cyan('   ├─ ') + chalk.white('Documentation: ') + chalk.blue.underline('https://github.com/linkedwebstorage/lws-server'));
console.log(chalk.cyan('   └─ ') + chalk.white('W3C LWS Spec:  ') + chalk.blue.underline('https://github.com/w3c/lws-protocol'));

console.log('\n' + chalk.dim('Press ') + chalk.bold.red('Ctrl+C') + chalk.dim(' to stop the server\n'));

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n' + chalk.yellow('⚠  Shutting down gracefully...'));
  await server.close();
  console.log(chalk.green('✓  Server stopped'));
  console.log(chalk.dim('\nGoodbye! 👋\n'));
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(chalk.yellow('\n⚠  Received SIGTERM, shutting down...'));
  await server.close();
  process.exit(0);
});
