/* eslint-disable @typescript-eslint/ban-types */
import { Predicate, Refinement, EqualityComparer, OrderingComparer } from "./prelude"
import { Option } from "./Option"
import { Result } from "./Result"
import { pipe } from "./composition"

interface NonEmptyArray<A> extends ReadonlyArray<A> {
    0: A
}

/**
 * Curried and readonly version of the built-in `filter`.
 * Accepts a plain predicate function or a refinement
 * function (a.k.a. type guard).
 *
 * @category Filtering
 */
function filter<A, B extends A>(
    refinement: Refinement<A, B>
): (as: readonly A[]) => readonly B[]
function filter<A>(
    predicate: Predicate<A>
): <B extends A>(bs: readonly B[]) => readonly B[]
function filter<A>(predicate: Predicate<A>): (as: readonly A[]) => readonly A[]
function filter<A>(f: Predicate<A>) {
    return <B extends A>(as: readonly B[]) => as.filter(f)
}

/**
 * Like {@link filter}, but the predicate function also accepts the
 * index of the element as an argument.
 *
 * @category Filtering
 */
const filteri =
    <A>(f: (a: A, i: number) => boolean) =>
    (as: readonly A[]): readonly A[] =>
        as.filter(f)

/**
 * Curried and readonly version of the built-in `map`.
 *
 * @category Mapping
 */
const map =
    <A, B>(f: (a: A) => B) =>
    (as: readonly A[]): readonly B[] =>
        as.map(f)

/**
 * Like {@link map} but the map function also accepts the
 * indes of the element as an argument.
 *
 * @category Mapping
 */
const mapi =
    <A, B>(f: (a: A, i: number) => B) =>
    (as: readonly A[]): readonly B[] =>
        as.map(f)

/**
 * Maps each value of the array into an `Option`, and keeps
 * only the inner values of those `Option`s that are`Some`.
 *
 * @remarks
 * Essentially, this is a map + filter operation where each
 * element of the array is mapped into an `Option` and an
 * `isSome` check is used as the filter function.
 *
 * @category Mapping
 *
 * @example
 * const actual = pipe(
 *     [32, null, 55, undefined, 89],   // (number | null | undefined)[]
 *     Array.choose(x => pipe(
 *         x,                           // number | null | undefined
 *         Option.ofNullish,            // Option<number>
 *         Option.map(String)           // Option<string>
 *     ))                               // string[]
 * )
 * expect(actual).toStrictEqual(["32", "55", "89"])
 */
const choose =
    <A, B extends {}>(f: (a: A) => Option<B>) =>
    (as: readonly A[]): readonly B[] => {
        const bs: B[] = []

        for (let i = 0; i < as.length; i++) {
            const maybeB = f(as[i])
            if (Option.isSome(maybeB)) {
                bs.push(maybeB.some)
            }
        }

        return bs
    }

/**
 * Like {@link choose}, but maps each value of the array into
 * a `Result`, and keeps only the values where the projection
 * returns `Ok`.
 *
 * @category Mapping
 *
 * @remarks
 * Essentially, this is a map + filter operation where each
 * element of the array is mapped into an `Result` and an
 * `isOk` check is used as the filter function.
 *
 * @example
 * const actual = pipe(
 *     [32, null, 55, undefined, 89],       // (number | null | undefined)[]
 *     Array.chooseR(x => pipe(
 *         x,                               // number | null | undefined
 *         Option.ofNullish,                // Option<number>
 *         Option.map(String),              // Option<string>
 *         Result.ofOption(() => "err")     // Result<string, string>
 *     ))                                   // string[]
 * )
 * expect(actual).toStrictEqual(["32", "55", "89"])
 */
const chooseR =
    <A, E, B>(f: (a: A) => Result<B, E>) =>
    (as: readonly A[]): readonly B[] => {
        const bs: B[] = []

        for (let i = 0; i < as.length; i++) {
            const result = f(as[i])
            if (Result.isOk(result)) {
                bs.push(result.ok)
            }
        }

        return bs
    }

/**
 * Get the first element of the array (wrapped in `Some`) if
 * non-empty, otherwise `None`.
 *
 * @category Utils
 * @category Pattern Matching
 */
const head = <A extends {}>(as: readonly A[]): Option<A> =>
    as.length > 0 ? Option.some(as[0]) : Option.none

/**
 * Get a new array containing all values except the first
 * one (wrapped in `Some`) if non-empty, otherwise `None`.
 *
 * @category Utils
 * @category Pattern Matching
 */
const tail = <A>(as: readonly A[]): Option<readonly A[]> => {
    if (as.length === 0) {
        return Option.none
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, ...tail] = as
    return Option.some(tail)
}

/**
 * Get the first `n` elements of the array. Will return the entire
 * array if `n` is greater than the length of the array.
 *
 * @param count is normalized to a non-negative integer
 *
 * @category Utils
 */
const take =
    (count: number) =>
    <A>(as: readonly A[]): readonly A[] => {
        const c = count <= 0 ? 0 : Math.floor(count)

        if (c > as.length) {
            return as
        }

        const out: A[] = []

        for (let i = 0; i < as.length && i < c; i++) {
            out.push(as[i])
        }

        return out
    }

/**
 * Get the remaining elements of the array
 * after skipping `n` elements. Returns empty if the
 * skip count goes past the end of the array.
 *
 * @category Utils
 *
 * @param count is normalized to a non-negative integer
 */
const skip =
    (count: number) =>
    <A>(as: readonly A[]): readonly A[] => {
        const c = count <= 0 ? 0 : Math.floor(count)

        if (c >= as.length) {
            return []
        }

        const out: A[] = []

        for (let i = c; i < as.length; i++) {
            out.push(as[i])
        }

        return out
    }

/**
 * Curried and readonly version of the built-in `reduce`.
 *
 * @category Utils
 */
const reduce =
    <A, B>(initialValue: B, reducer: (acc: B, next: A) => B) =>
    (as: readonly A[]): B =>
        as.reduce(reducer, initialValue)

/**
 * Curried and readonly version of the built-in `reduceRight`.
 *
 * @category Utils
 */
const reduceRight =
    <A, B>(initialValue: B, reducer: (acc: B, next: A) => B) =>
    (as: readonly A[]): B =>
        as.reduceRight(reducer, initialValue)

const isRawValue = <A, R>(caseFn: R | ((ok: A) => R)): caseFn is R =>
    typeof caseFn !== "function"

const getMatcherResult = <T, R>(match: ((t: T) => R) | R, arg: T) =>
    isRawValue(match) ? match : match(arg)

interface ArrayMatcher<A, R> {
    empty: (() => R) | R
    nonEmpty: ((as: NonEmptyArray<A>) => R) | R
}

/**
 * Exhaustive pattern match against an array to "unwrap" its values. Provide
 * a matcher object to handle both the `empty` and `nonEmpty` cases.
 * The matcher can use lambdas or raw values. In the `nonEmpty` case,
 * the lambda will be given a `NonEmptyArray`.
 *
 * @category Pattern Matching
 *
 * @example
 * pipe(
 *     ["a", "b"],
 *     Array.match({
 *         empty: () => "default",
 *         nonEmpty: Array.reduceRight("", (a, b) => `${a}${b}`)
 *     })
 * ); // "ba"
 */
const match =
    <A, R>(matcher: ArrayMatcher<A, R>) =>
    (as: readonly A[]): R =>
        as.length > 0
            ? getMatcherResult(matcher.nonEmpty, as as NonEmptyArray<A>)
            : getMatcherResult(matcher.empty, undefined)

/**
 * Type guard that tests whether the given array is equivalent
 * to the empty tuple type.
 *
 * @category Type Guards
 * @category Utils
 */
const isEmpty = <A>(as: readonly A[]): as is readonly [] => as.length === 0

/**
 * Type guard that thests whether the given array is a `NonEmptyArray`
 *
 * @category Type Guards
 * @category Utils
 */
const isNonEmpty = <A>(as: readonly A[]): as is NonEmptyArray<A> => as.length > 0

/**
 * Also commonly known as `flatMap`. Maps each element of the array
 * given a function that itself returns an array, then flattens the result.
 *
 * @category Mapping
 */
const bind =
    <A, B>(f: (a: A) => readonly B[]) =>
    (as: readonly A[]): readonly B[] =>
        as.flatMap(f)

/**
 * Alias of {@link bind}.
 *
 * @category Mapping
 */
const flatMap = bind

/**
 * Add an element to the _end_ of an array. Always returns
 * a `NonEmptyArray`.
 *
 * @category Utils
 */
const append =
    <A>(a: A) =>
    (as: readonly A[]): NonEmptyArray<A> =>
        [...as, a] as unknown as NonEmptyArray<A>

/**
 * Also known as `cons`. Insert an element at the beginning
 * of an array. Always returns a `NonEmptyArray`.
 *
 * @category Utils
 */
const prepend =
    <A>(a: A) =>
    (as: readonly A[]): NonEmptyArray<A> =>
        [a, ...as]

/**
 * Return a Map of keys to groups, where the selector function
 * is used to generate a string key that determines in which group
 * each array element is placed.
 *
 * @category Grouping
 * @category Utils
 *
 * @example
 * pipe(
 *     [1, 2, 1, 2, 3, 3, 5],
 *     Array.groupBy(String)
 * )
 * // structurally equivalent to
 * new Map([
 *     ['1', [1, 1]],
 *     ['2', [2, 2]],
 *     ['3', [3, 3]],
 *     ['5', [5]]
 * ])
 */
const groupBy =
    <A>(selector: (a: A) => string) =>
    (as: readonly A[]): ReadonlyMap<string, NonEmptyArray<A>> => {
        const groups: Map<string, NonEmptyArray<A>> = new Map()

        as.forEach(a => {
            const key = selector(a)

            return groups.has(key)
                ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  groups.set(key, pipe(groups.get(key)!, append(a)))
                : groups.set(key, [a])
        })

        return groups
    }

/**
 * Add an array of values to the _end_ of the subsequently
 * passed (partially applied) array, in a way that makes sense
 * when reading top-to-bottom using `pipe`.
 *
 * @category Utils
 *
 * @example
 * pipe(
 *     [1, 2],
 *     Array.concat([3, 4])
 * ) // [1, 2, 3, 4]
 */
const concat =
    <A>(addToEnd: readonly A[]) =>
    (as: readonly A[]): readonly A[] =>
        [...as, ...addToEnd]

/**
 * Like {@link concat}, except this adds an array of values to the
 * _beginning_ of the subsequently (partially applied) array,
 * in a way that makes more sense when _not_ using `pipe`.
 *
 * @category Utils
 *
 * @example
 * // it reads "backwards" when used with `pipe`
 * pipe(
 *     ["a", "b"],
 *     Array.concatFirst(["c", "d"])
 * ) // ["c", "d", "a", "b"]
 *
 * @example
 * // it reads better when not used with `pipe`
 * Array.concatFirst(["a", "b"])(["c", "d"]) // ["a", "b", "c", "d"]
 */
const concatFirst =
    <A>(addToFront: readonly A[]) =>
    (as: readonly A[]): readonly A[] =>
        [...addToFront, ...as]

/**
 * Returns true if at least one element of the array
 * satisfies the given predicate. Curried version of
 * `Array.prototype.some`.
 *
 * @category Utils
 */
const exists =
    <A>(predicate: (a: A) => boolean) =>
    (as: readonly A[]): boolean =>
        as.some(predicate)

/**
 * Alias of {@link exists}.
 *
 * @category Utils
 */
const some = exists

/**
 * Equivalent to calling `Array.prototype.flat()` with a depth of 1.
 *
 * @category Utils
 */
const flatten = <A>(as: readonly A[][]): readonly A[] => as.flat()

/**
 * Split an array into chunks of a specified size. The final
 * chunk will contain fewer elements than the specified size if
 * the array is not evenly divisible by the specified size.
 *
 * @remarks
 * **Note:** Will return `[]`, _not_ `[[]]` if given an empty array.
 *
 * @param maxChunkSize will be normalized to a natural number
 *
 * @example
 * pipe(
 *     ["a", "b", "c", "d", "e"],
 *     Array.chunk(2)
 * ) // [["a", "b"], ["c", "d"], ["e"]]
 *
 * @category Utils
 */
const chunk =
    (maxChunkSize: number) =>
    <A>(as: readonly A[]): readonly NonEmptyArray<A>[] => {
        if (isEmpty(as)) {
            return []
        }

        const chunkSize = maxChunkSize <= 1 ? 1 : Math.floor(maxChunkSize)

        const numChunks = Math.ceil(as.length / chunkSize)

        const chunks: A[][] = [...globalThis.Array(numChunks)].map(() => [])

        let chunkIndex = 0

        for (let i = 0; i < as.length; i++) {
            if (i !== 0 && i % chunkSize === 0) {
                chunkIndex++
            }
            chunks[chunkIndex].push(as[i])
        }

        return chunks as unknown as readonly NonEmptyArray<A>[]
    }

/**
 * Get the length of an array.
 *
 * @category Utils
 */
const length = <A>(as: readonly A[]) => as.length

/**
 * Returns true if the given element is in the array.
 * Optionally, pass an `EqualityComparer` to use. Uses
 * reference (triple equals) equality by default.
 *
 * @category Utils
 */
const contains =
    <A>(a: A, equalityComparer?: EqualityComparer<A>) =>
    (as: readonly A[]): boolean => {
        if (isEmpty(as)) {
            return false
        }

        const referenceEquals = <T>(o1: T, o2: T) => o1 === o2
        const equals = equalityComparer?.equals ?? referenceEquals
        const predicate = (test: A) => equals(a, test)

        return as.some(predicate)
    }

/**
 * Return a new array containing only unique values. If
 * passed, uses the `EqualityComparer` to test uniqueness.
 * Defaults to using reference equality (triple equals).
 *
 * @category Utils
 *
 * @example
 * pipe(
 *     [3, 2, 1, 2, 1, 4, 9],
 *     Array.uniq()
 * ) // [3, 2, 1, 4, 9]
 */
const uniq =
    <A>(equalityComparer?: EqualityComparer<A>) =>
    (as: readonly A[]): readonly A[] => {
        if (isEmpty(as)) {
            return []
        }

        const out: A[] = []

        as.forEach(a => {
            if (!contains(a, equalityComparer)(out)) {
                out.push(a)
            }
        })

        return out
    }

/**
 * Returns a new array containing only unique values as determined
 * by mapping each element with the given function and optionally
 * passing an equality comparer to use on the mapped elements.
 * Defaults to using reference equality (triple equals).
 *
 * @category Utils
 *
 * @example
 * pipe(
 *     [{ name: "Rufus" }, { name: "Rex" }, { name: "Rufus" }],
 *     Array.uniqBy(p => p.name)
 * ) // [{ name: "Rufus" }, { name: "Rex" }]
 */
const uniqBy =
    <A, B>(f: (a: A) => B, equalityComparer?: EqualityComparer<B>) =>
    (as: readonly A[]): readonly A[] => {
        if (isEmpty(as)) {
            return []
        }

        const out: A[] = []
        const projections: B[] = []

        as.forEach(a => {
            const projected = f(a)
            if (!contains(projected, equalityComparer)(projections)) {
                projections.push(projected)
                out.push(a)
            }
        })

        return out
    }

/**
 * Get a new array with elements sorted. If given, will use the
 * `OrderingComparer`. Otherwise, defaults to the JS ASCII-based sort.
 *
 * @category Utils
 *
 * @example
 * declare const petByNameComparer: OrderingComparer<Pet>
 *
 * const pets: readonly Pet[] = [
 *     { name: "Fido" },
 *     { name: "Albus" },
 *     { name: "Rex" },
 *     { name: "Gerald" }
 * ]
 *
 * pipe(
 *     pets,
 *     Array.sort(petByNameComparer),
 *     Array.map(p => p.name)
 * ) // [ "Albus", "Fido", "Gerald", "Rex" ]
 */
const sort =
    <A>(orderingComparer?: OrderingComparer<A>) =>
    (as: readonly A[]): readonly A[] => {
        if (isEmpty(as)) {
            return []
        }

        return as.slice(0).sort(orderingComparer?.compare)
    }

/**
 * Get a new array with elements sorted based on the sort-order
 * of each mapped element produced by the given mapping function.
 * If given, will use the `OrderingComparer`. Otherwise, defaults to an
 * OrderingComparer that `String`s the mapped element and uses the
 * default ASCII-based sort.
 *
 * @category Utils
 */
const sortBy =
    <A, B>(f: (a: A) => B, orderingComparer?: OrderingComparer<B>) =>
    (as: readonly A[]): readonly A[] => {
        if (isEmpty(as)) {
            return []
        }

        const compareFn =
            orderingComparer != null
                ? (o1: A, o2: A): number => orderingComparer.compare(f(o1), f(o2))
                : (o1: A, o2: A): number => String(f(o1)).localeCompare(String(f(o2)))

        return as.slice(0).sort(compareFn)
    }

/**
 * Get a new array with the elements in reverse order.
 *
 * @category Utils
 */
const reverse = <A>(as: readonly A[]): readonly A[] => as.slice(0).reverse()

/**
 * Get the _first_ element in the array (wrapped in a `Some`) that
 * returns `true` for the given predicate, or `None` if no such
 * element exists.
 *
 * @category Utils
 */
const find =
    <A extends {}>(predicate: Predicate<A>) =>
    (as: readonly A[]): Option<A> =>
        Option.ofNullish(as.find(predicate))

/**
 * Get the _first_ index of the array (wrapped in a `Some`) for
 * which the element at that index returns true for the given predicate,
 * or `None` if no such index/element exists.
 *
 * @category Utils
 */
const findIndex =
    <A>(predicate: Predicate<A>) =>
    (as: readonly A[]): Option<number> => {
        const result = as.findIndex(predicate)
        return result < 0 ? Option.none : Option.some(result)
    }

/**
 * Get a new array containing only those elements that are not
 * in the given `excludeThese` array. If given, will use the
 * EqualityComparer. Otherwise, defaults to reference equality
 * (triple equals).
 *
 * @category Utils
 */
const except =
    <A>(excludeThese: readonly A[], equalityComparer?: EqualityComparer<A>) =>
    (as: readonly A[]): readonly A[] => {
        if (isEmpty(as)) {
            return []
        }

        if (isEmpty(excludeThese)) {
            return as
        }

        const out: A[] = []

        for (let i = 0; i < as.length; i++) {
            if (!pipe(excludeThese, contains(as[i], equalityComparer))) {
                out.push(as[i])
            }
        }

        return out
    }

/**
 * Get a new array containing the set union of two arrays, defined as the
 * set of elements contained in both arrays.
 *
 * @remarks
 * Remember that sets only contain unique elements. If you just need to join
 * two arrays together, use `concat`.
 *
 * @category Utils
 */
const union =
    <A>(unionWith: readonly A[], equalityComparer?: EqualityComparer<A>) =>
    (as: readonly A[]): readonly A[] =>
        isEmpty(unionWith) && isEmpty(as)
            ? []
            : pipe(as, concat(unionWith), uniq(equalityComparer))

export const Array = {
    filter,
    filteri,
    map,
    mapi,
    bind,
    flatMap,
    choose,
    chooseR,
    head,
    tail,
    take,
    skip,
    reduce,
    reduceRight,
    match,
    isEmpty,
    isNonEmpty,
    append,
    prepend,
    groupBy,
    concat,
    concatFirst,
    exists,
    some,
    flatten,
    chunk,
    length,
    contains,
    uniq,
    uniqBy,
    sort,
    sortBy,
    reverse,
    find,
    findIndex,
    except,
    union,
}
