// NOTE: this is copied here rather than imported so that
// end users don't end up importing the NonEmptyArray module
// if they only wanted to import the String module.
interface NonEmptyArray<A> extends ReadonlyArray<A> {
    0: A
}

/**
 * A boolean check that also serves as a type guard which narrows the
 * type to the string literal `""`.
 *
 * @category Utils
 * @category Type Guards
 *
 * @returns boolean
 */
const isEmpty = (s: string): s is "" => s === ""

/**
 * Curried version of the built-in trim method.
 *
 * @category Utils
 */
const trim = (s: string) => s.trim()

/**
 * Curried version of the built-in toLowerCase method.
 *
 * @category Utils
 */
const toLowerCase = (s: string) => s.toLowerCase()

/**
 * Curried version of the built-in toUpperCase method.
 *
 * @category Utils
 */
const toUpperCase = (s: string) => s.toUpperCase()

/**
 * Type guard that holds true when `u` is a string.
 *
 * @category Type Guards
 *
 * @returns boolean
 */
const isString = (u: unknown): u is string => typeof u === "string"

/**
 * Get the length of a string.
 *
 * @category Utils
 */
const length = (s: string) => s.length

/**
 * Curried version of the built-in split method that
 * is guaranteed to always return at least one entry.
 *
 * @remarks
 * If the split fails to produce at least one entry, the entire
 * input string is returned as a single-element array.
 *
 * @category Utils
 */
const split =
    (separator: string | RegExp) =>
    (s: string): NonEmptyArray<string> => {
        const result = s.split(separator)
        return result.length > 0 ? (result as unknown as NonEmptyArray<string>) : [s]
    }

export const String = {
    isEmpty,
    trim,
    toLowerCase,
    toUpperCase,
    isString,
    split,
    length,
}
