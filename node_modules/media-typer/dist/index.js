/**
 * RegExp to match type in RFC 6838
 *
 * type-name = restricted-name
 * subtype-name = restricted-name
 * restricted-name = restricted-name-first *126restricted-name-chars
 * restricted-name-first  = ALPHA / DIGIT
 * restricted-name-chars  = ALPHA / DIGIT / "!" / "#" /
 *                          "$" / "&" / "-" / "^" / "_"
 * restricted-name-chars =/ "." ; Characters before first dot always
 *                              ; specify a facet name
 * restricted-name-chars =/ "+" ; Characters after last plus always
 *                              ; specify a structured syntax suffix
 * ALPHA =  %x41-5A / %x61-7A   ; A-Z / a-z
 * DIGIT =  %x30-39             ; 0-9
 */
const subtypeNameRegExp = /^[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}$/;
const typeNameRegExp = /^[A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126}$/;
const typeRegExp = /^[A-Za-z0-9][A-Za-z0-9!#$&^_-]{0,126}\/[A-Za-z0-9][A-Za-z0-9!#$&^_.+-]{0,126}$/;
/**
 * Format object to media type.
 */
export function format(obj) {
    const { type, subtype, suffix } = obj;
    if (!type || !typeNameRegExp.test(type)) {
        throw new TypeError(`Invalid type: ${type}`);
    }
    if (!subtype || !subtypeNameRegExp.test(subtype)) {
        throw new TypeError(`Invalid subtype: ${subtype}`);
    }
    let str = type + "/" + subtype;
    if (suffix !== undefined) {
        if (!typeNameRegExp.test(suffix)) {
            throw new TypeError(`Invalid suffix: ${suffix}`);
        }
        str += "+" + suffix;
    }
    return str;
}
/**
 * Parse media type to object.
 */
export function parse(str) {
    if (!typeRegExp.test(str)) {
        throw new TypeError(`Invalid media type: ${str}`);
    }
    const slashIndex = str.indexOf("/");
    const type = str.slice(0, slashIndex).toLowerCase();
    let subtype = str.slice(slashIndex + 1).toLowerCase();
    let suffix;
    const index = subtype.lastIndexOf("+");
    if (index !== -1) {
        suffix = subtype.slice(index + 1);
        subtype = subtype.slice(0, index);
    }
    return { type, subtype, suffix };
}
/**
 * Test media type.
 */
export function test(str) {
    return typeRegExp.test(str);
}
//# sourceMappingURL=index.js.map