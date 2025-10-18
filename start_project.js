#!/usr/bin/env node
/**
 * Unified startup script for the Clean Route Radar project
 * This script starts both the Flask backend and React frontend
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting Clean Route Radar Project...\n');

// Check if requirements.txt exists
if (!fs.existsSync('requirements.txt')) {
    console.error('❌ requirements.txt not found. Please make sure you\'re in the project root directory.');
    process.exit(1);
}

// Check if app.py exists
if (!fs.existsSync('app.py')) {
    console.error('❌ app.py not found. Please make sure you\'re in the project root directory.');
    process.exit(1);
}

console.log('📦 Installing Python dependencies...');
const pipInstall = spawn('pip', ['install', '-r', 'requirements.txt'], {
    stdio: 'inherit',
    shell: true
});

pipInstall.on('close', (code) => {
    if (code !== 0) {
        console.error('❌ Failed to install Python dependencies');
        process.exit(1);
    }

    console.log('✅ Python dependencies installed\n');

    console.log('🐍 Starting Flask backend...');
    const flaskServer = spawn('python', ['app.py'], {
        stdio: 'pipe',
        shell: true
    });

    flaskServer.stdout.on('data', (data) => {
        console.log(`[Flask] ${data.toString().trim()}`);
    });

    flaskServer.stderr.on('data', (data) => {
        console.log(`[Flask Error] ${data.toString().trim()}`);
    });

    // Wait a moment for Flask to start
    setTimeout(() => {
        console.log('⚛️ Starting React frontend...');
        const reactServer = spawn('npm', ['run', 'dev'], {
            stdio: 'inherit',
            shell: true
        });

        reactServer.on('close', (code) => {
            console.log('React frontend stopped');
            flaskServer.kill();
        });
    }, 2000);

    // Handle process termination
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping servers...');
        flaskServer.kill();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        console.log('\n🛑 Stopping servers...');
        flaskServer.kill();
        process.exit(0);
    });
});

pipInstall.on('error', (err) => {
    console.error('❌ Error installing dependencies:', err);
    process.exit(1);
});
