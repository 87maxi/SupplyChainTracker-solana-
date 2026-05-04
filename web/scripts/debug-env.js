console.log('=== Debugging Server Environment Variables ===');
console.log('PWD:', process.env.PWD);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('CWD:', process.cwd());
console.log('Environment variables available:');

// Log all environment variables for debugging
Object.keys(process.env)
  .filter(key => key.includes('NEXT_PUBLIC') || key.includes('ANVIL') || key.includes('RPC') || key.includes('CHAIN') || key.includes('PINATA') || key.includes('WALLET'))
  .sort()
  .forEach(key => {
    console.log(`  ${key}: ${process.env[key]}`);
  });

// Verify critical variables
const requiredVars = [
  'NEXT_PUBLIC_SUPPLY_CHAIN_TRACKER_ADDRESS',
  'NEXT_PUBLIC_RPC_URL',
  'NEXT_PUBLIC_CHAIN_ID'
];

console.log('\nVerifying required variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else {
    console.log(`❌ ${varName}: Not set`);
  }
});

console.log('========================================');