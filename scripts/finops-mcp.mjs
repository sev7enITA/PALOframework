#!/usr/bin/env node
import {readFile,stat} from 'node:fs/promises';
import {StdioServerTransport} from '@modelcontextprotocol/server/stdio';
import {createFinOpsMcpServer} from '../packages/palo-finops/mcp.js';
async function read(path){if(!path||(await stat(path)).size>2*1024*1024)throw new Error('Configure a local JSON file under 2 MiB.');return JSON.parse(await readFile(path,'utf8'));}
try{
 const [bundlePath,configPath]=process.argv.slice(2);
 const server=await createFinOpsMcpServer(await read(bundlePath),await read(configPath),{credential:process.env.PALO_FINOPS_PRINCIPAL_TOKEN});
 await server.connect(new StdioServerTransport());
}catch(e){process.stderr.write('FinOps reader: '+e.message+'\n');process.exitCode=1;}
