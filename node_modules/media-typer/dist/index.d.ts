/**
 * Media type object.
 */
export interface MediaType {
    /**
     * The type of the media type.
     */
    type: string;
    /**
     * The subtype of the media type.
     */
    subtype: string;
    /**
     * The structured syntax suffix of the media type.
     */
    suffix?: string;
}
/**
 * Format object to media type.
 */
export declare function format(obj: MediaType): string;
/**
 * Parse media type to object.
 */
export declare function parse(str: string): MediaType;
/**
 * Test media type.
 */
export declare function test(str: string): boolean;
