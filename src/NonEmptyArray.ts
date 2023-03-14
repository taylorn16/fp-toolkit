export interface NonEmptyArray<A> extends ReadonlyArray<A> {
    0: A
}

/**
 * Get the first element of a non-empty array.
 *
 * @category Utils
 * @category Pattern Matching
 */
const head = <A>(as: NonEmptyArray<A>) => as[0]

/**
 * Destructure the non-empty array into an object containing
 * the head and the tail.
 *
 * @category Pattern Matching
 *
 * @example
 * const { head, tail } = NonEmptyArray.destruct([1, 2, 3])
 * // head is 1
 * // tail is [2, 3]
 */
const destruct = <A>(
    as: NonEmptyArray<A>
): {
    readonly head: A
    readonly tail: readonly A[]
} => ({
    head: as[0],
    tail: as.slice(1),
})

/**
 * Curried version of the built-in map that maintains
 * strong NonEmptyArray typing.
 *
 * @category Mapping
 *
 * @returns A new non-empty array containing the mapped elements.
 */
const map =
    <A, B>(f: (a: A) => B) =>
    (as: NonEmptyArray<A>): NonEmptyArray<B> =>
        as.map(f) as unknown as NonEmptyArray<B>

/**
 * Uses the given function to map each element into a non-empty array,
 * then flattens the results. Commonly called flatMap` or `chain`.
 *
 * @category Mapping
 *
 * @returns A new non-empty array containing the mapped/flattened elements.
 */
const bind =
    <A, B>(f: (a: A) => NonEmptyArray<B>) =>
    (as: NonEmptyArray<A>): NonEmptyArray<B> =>
        as.flatMap(f) as unknown as NonEmptyArray<B>

/**
 * Alias for {@link bind}.
 *
 * @category Mapping
 */
const flatMap = bind

/**
 * Constructs a new non-empty array containing exactly one element.
 *
 * @category Constructors
 */
const of = <A>(a: A): NonEmptyArray<A> => [a]

/**
 * Create a new array by enumerating the integers between
 * the given start and end, inclusive of both start and end.
 *
 * Both start and end are normalized to integers, and end is
 * normalized to always be at least equal to start.
 *
 * @category Constructors
 * @category Utils
 *
 * @example
 * NonEmptyArray.range(1, 5)    // [1, 2, 3, 4, 5]
 * NonEmptyArray.range(-10, 1)  // [-10, -9, -8, ..., 1]
 * NonEmptyArray.range(2, -5)   // [2]
 * NonEmptyArray.range(1, 1)    // [1]
 */
const range = (startInclusive: number, endInclusive: number): NonEmptyArray<number> => {
    const start = Math.floor(startInclusive)
    const end = Math.floor(endInclusive)

    if (start >= end) {
        return [start]
    }

    const out: number[] = []
    for (let i = start; i <= end; i++) {
        out.push(i)
    }
    return out as unknown as NonEmptyArray<number>
}

/**
 * Construct a new non-empty array with the specified number
 * of elements, using a constructor function for each element
 * that takes a zero-based index of the element being constructed.
 *
 * @param length is normalized to a non-negative integer
 *
 * @category Constructors
 * @category Utils
 *
 * @example
 * NonEmptyArray.make(3, i => `${i}`) // ["0", "1", "2"]
 */
const make = <A>(length: number, createElement: (i: number) => A): NonEmptyArray<A> => {
    const n = length <= 1 ? 1 : Math.floor(length)
    return [...Array(n).keys()].map(createElement) as unknown as NonEmptyArray<A>
}

/**
 * Reverses an array. Preserves correct types.
 *
 * @category Utils
 *
 * @returns A new non-empty array with elements in reverse order.
 */
const reverse = <A>(as: NonEmptyArray<A>): NonEmptyArray<A> =>
    as.slice(0).reverse() as unknown as NonEmptyArray<A>

export const NonEmptyArray = {
    head,
    destruct,
    map,
    bind,
    flatMap,
    of,
    range,
    make,
    reverse,
}
