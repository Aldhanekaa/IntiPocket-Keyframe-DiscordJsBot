class IDGenerator {
    /**
     * Generate a random number between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random number
     */
    static getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Generate a random hexadecimal string of specified length
     * @param {number} length - Length of the hex string
     * @returns {string} Random hex string
     */
    static getRandomHex(length) {
        const hexChars = '0123456789abcdef';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += hexChars[this.getRandomInt(0, 15)];
        }
        return result;
    }

    /**
     * Generate a UUID v4 without external library
     * @returns {string} A UUID v4 string
     */
    static generateUUID() {
        const uuid = [
            this.getRandomHex(8),
            this.getRandomHex(4),
            '4' + this.getRandomHex(3), // Version 4
            (this.getRandomInt(0, 3) | 8).toString(16) + this.getRandomHex(3), // Variant
            this.getRandomHex(12)
        ].join('-');
        return uuid;
    }

    /**
     * Generate a ULID without external library
     * @returns {string} A ULID string
     */
    static generateULID() {
        const timestamp = Date.now();
        const randomness = Array.from({ length: 10 }, () =>
            Math.floor(Math.random() * 36).toString(36)
        ).join('');

        const timestampPart = timestamp.toString(36).padStart(10, '0');
        return (timestampPart + randomness).toUpperCase();
    }

    /**
     * Generate a Snowflake ID
     * @param {number} workerId - Worker ID (0-1023)
     * @param {number} datacenterId - Datacenter ID (0-31)
     * @returns {string} A Snowflake ID string
     */
    static generateSnowflake(workerId = 1, datacenterId = 1) {
        const epoch = 1609459200000; // 2021-01-01
        let sequence = 0;
        let lastTimestamp = -1;

        const timestamp = Date.now();

        if (timestamp === lastTimestamp) {
            sequence = (sequence + 1) & 4095; // 12 bits for sequence
            if (sequence === 0) {
                // Wait for next millisecond
                return this.generateSnowflake(workerId, datacenterId);
            }
        } else {
            sequence = 0;
        }

        lastTimestamp = timestamp;

        const snowflake = BigInt(timestamp - epoch) << 22n |
            BigInt(datacenterId) << 17n |
            BigInt(workerId) << 12n |
            BigInt(sequence);

        return snowflake.toString();
    }

    /**
     * Generate a custom ID with prefix
     * @param {string} prefix - Prefix for the ID
     * @param {number} length - Length of the random part
     * @returns {string} A custom ID string
     */
    static generateCustomId(prefix = 'ID', length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = prefix + '_';

        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return result;
    }
}

module.exports = IDGenerator; 