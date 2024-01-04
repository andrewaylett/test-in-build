/** @type {import('../../types.d.ts').assert} */
const assert = (blob, expect) => {
    expect(blob).not.toMatch('error');
    expect(blob).toMatch('# pass 3');
};

// eslint-disable-next-line no-undef
module.exports = { assert };
