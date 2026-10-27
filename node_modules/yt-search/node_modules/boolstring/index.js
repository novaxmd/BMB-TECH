var boolString = function(string) {
    return [
        'true',
        'yes',
        'enable',
        'enabled',
        'valid',
        'validated',
        'active',
        'activated',
        'permit',
        'permitted',
        'allow',
        'allowed',
        'pass',
        'passed',
        'on',
        '1'
    ].includes(string.toLowerCase());
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = boolString;
}