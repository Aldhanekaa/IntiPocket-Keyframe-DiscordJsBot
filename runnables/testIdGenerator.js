const IDGenerator = require('../func/idGenerator');

/**
 * Test function to demonstrate different ID generation methods
 */
function testIdGeneration() {
    console.log('=== ID Generator Test ===\n');

    // Test UUID
    console.log('UUID Examples:');
    for (let i = 0; i < 3; i++) {
        console.log(`  ${IDGenerator.generateUUID()}`);
    }
    console.log();

    // Test ULID
    console.log('ULID Examples:');
    for (let i = 0; i < 3; i++) {
        console.log(`  ${IDGenerator.generateULID()}`);
    }
    console.log();

    // Test Snowflake
    console.log('Snowflake Examples:');
    for (let i = 0; i < 3; i++) {
        console.log(`  ${IDGenerator.generateSnowflake(1, 1)}`);
    }
    console.log();

    // Test Custom ID with different prefixes
    console.log('Custom ID Examples:');
    const prefixes = ['USER', 'ORDER', 'PRODUCT', "VPS"];
    prefixes.forEach(prefix => {
        console.log(`  ${prefix}: ${IDGenerator.generateCustomId(prefix, 10)}`);
    });
}

// Run the test
testIdGeneration(); 