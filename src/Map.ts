/* eslint-disable @typescript-eslint/ban-types */
import { EqualityComparer, OrderingComparer, Predicate } from "./prelude"
import { Option } from "./Option"
import { pipe } from "./composition"

const defaultEqualityComparer: EqualityComparer<never> = {
    equals: (a, b) => a === b,
}

const defaultOrderingComparer: OrderingComparer<never> = {
    compare: (a, b) => {
        const stringA = String(a)
        const stringB = String(b)
        return stringA === stringB ? 0 : stringA.localeCompare(stringB) < 0 ? -1 : 1
    },
    equals: defaultEqualityComparer.equals,
}

/**
 * Lookup a key/value pair (wrapped in a `Some`) from a `Map` using the given key.
 * If the `Map` doesn't contain the key, returns `None`.
 *
 * Uses the given equality comparer if passed. Otherwise, defaults to reference
 * equality (triple equals) for equality comparisons.
 *
 * @category Lookups
 *
 * @returns An `Option` containing a tuple of the key and value.
 */
const findWithKey =
    <K>(key: K, { equals }: EqualityComparer<K> = defaultEqualityComparer) =>
    <V>(map: ReadonlyMap<K, V>): Option<[K, V]> => {
        if (map.size < 1) {
            return Option.none
        }

        for (const [k, v] of map) {
            if (equals(k, key)) {
                return Option.some([k, v])
            }
        }

        return Option.none
    }

/**
 * Test whether a `Map` contains the given key. Uses the given `EqualityComparer`
 * if passed. Otherwise, defaults to reference equality (triple equals).
 *
 * @category Lookups
 *
 * @returns `true` if the key is in the `Map`, `false` otherwise.
 */
const containsKey =
    <K>(key: K, equalityComparer: EqualityComparer<K> = defaultEqualityComparer) =>
    <V>(map: ReadonlyMap<K, V>): boolean =>
        pipe(map, findWithKey(key, equalityComparer), Option.isSome)

/**
 * Get a value associated with the given key from the `Map`. Returns a `Some`
 * containing the value, or `None` if the key is not in the `Map`.
 *
 * Uses the given equality comparer if passed, otherwise defaults to using
 * reference equality (triple equals) for equality comparison.
 *
 * @category Lookups
 */
const find =
    <K>(key: K, equalityComparer: EqualityComparer<K> = defaultEqualityComparer) =>
    <V extends {}>(map: ReadonlyMap<K, V>): Option<V> =>
        pipe(
            map,
            findWithKey(key, equalityComparer),
            Option.map(([, v]) => v)
        )

/**
 * Adds a key/value pair to a `Map`. If the given key already exists
 * the value at that key will be updated with the given value.
 *
 * Will use the equality comparer if given, otherwise defaults to using
 * reference equality (triple equals) for equality comparisons.
 *
 * @category Transformations
 *
 * @returns A new `Map` with the added key/value pair
 */
const add =
    <K, V>(
        [key, value]: readonly [K, V],
        equalityComparer: EqualityComparer<K> = defaultEqualityComparer
    ) =>
    (map: ReadonlyMap<K, V>): ReadonlyMap<K, V> => {
        if (map.size < 1) {
            const out = empty<K, V>()
            out.set(key, value)
            return out
        }

        const copy = new globalThis.Map(map)

        return pipe(
            map,
            findWithKey(key, equalityComparer),
            Option.match({
                none: () => {
                    copy.set(key, value)
                    return copy
                },
                some: ([k]) => {
                    copy.set(k, value)
                    return copy
                },
            })
        )
    }

/**
 * Make a new `Map` by producing a new each value for each key using
 * the given function.
 *
 * @category Mapping
 * @category Transformations
 */
const map =
    <K, V, R>(f: (k: K, v: V) => R) =>
    (map: ReadonlyMap<K, V>): ReadonlyMap<K, R> => {
        if (map.size < 1) {
            return empty<K, R>()
        }

        const out = empty<K, R>()

        for (const [k, v] of map) {
            out.set(k, f(k, v))
        }

        return out
    }

/**
 * Get the first key for which the given predicate function returns
 * true, wrapped in a `Some`. If no key is found, returns `None`. Uses
 * the given `OrderingComparer` if passed, otherwise defaults to default
 * ASCII-based sort.
 *
 * @category Lookups
 */
const findKey =
    <K extends {}>(
        predicate: Predicate<K>,
        orderingComparer: OrderingComparer<K> = defaultOrderingComparer
    ) =>
    <V>(map: ReadonlyMap<K, V>): Option<K> =>
        Option.ofNullish(keys(orderingComparer)(map).find(predicate))

/**
 * Creates a new empty map. Essentially an alias for `new globalThis.Map()`.
 * Provided for convience to avoid having to use `globalThis`.
 *
 * @category Constructors
 */
const empty = <K = never, V = never>() => new globalThis.Map<K, V>()

/**
 * Returns `true` if at least one _value_ in the `Map` returns `true`
 * for the given predicate function.
 *
 * @category Lookups
 * @category Utils
 */
const exists =
    <V>(predicate: Predicate<V>) =>
    <K>(map: ReadonlyMap<K, V>): boolean => {
        if (map.size < 1) {
            return false
        }

        for (const [, v] of map) {
            if (predicate(v)) {
                return true
            }
        }

        return false
    }

/**
 * Replace the value at a given key in the map using the given
 * replacement function. Will use the given `EqualityComparer`
 * if passed. Otherwise defaults to reference equality (triple equals).
 *
 * If the key isn't in the map, returns the map unchanged.
 *
 * @category Transformations
 */
const change =
    <K, V>(
        key: K,
        f: (v: V) => V,
        equalityComparer: EqualityComparer<K> = defaultEqualityComparer
    ) =>
    (map: ReadonlyMap<K, V>): ReadonlyMap<K, V> =>
        pipe(
            map,
            findWithKey(key, equalityComparer),
            Option.match({
                some: ([k, v]) => {
                    const copy = new globalThis.Map(map)
                    copy.set(k, f(v))
                    return copy
                },
                none: map,
            })
        )

/**
 * Get the number of key/value pairs in the map.
 *
 * @category Utils
 */
const size = <K, V>(map: ReadonlyMap<K, V>) => map.size

/**
 * Returns whether the map contains any key/value pairs.
 *
 * @category Utils
 *
 * @returns `true` if the map has no bindings, `false` otherwise.
 */
const isEmpty = <K, V>(map: ReadonlyMap<K, V>) => map.size < 1

/**
 * Get only the keys from the map as an array. Will use the given `OrderingComparer`
 * to sort the keys, otherwise will the default ASCII-based sort.
 *
 * @category Utils
 */
const keys =
    <K>({ compare }: OrderingComparer<K> = defaultOrderingComparer) =>
    <V>(map: ReadonlyMap<K, V>): readonly K[] =>
        Array.from(map.keys()).sort(compare)

/**
 * Gets all the values from the map as an array, including duplicates. Values
 * will be sorted by their corresponding key, using the default ASCII-based
 * sort or the `OrderingComparer` that is given.
 
 * @category Utils
 */
const values =
    <K>(orderingComparer: OrderingComparer<K> = defaultOrderingComparer) =>
    <V>(map: ReadonlyMap<K, V>): readonly V[] =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        keys(orderingComparer)(map).map(key => map.get(key)!)

/**
 * Returns the map as an array of key-value tuples. The array will be sorted by
 * key, using the given `OrderingComparer` or falling back to the default ASCII-based
 * sort.
 *
 * @category Transformations
 * @category Utils
 */
const toArray =
    <K>(orderingComparer: OrderingComparer<K> = defaultOrderingComparer) =>
    <V>(map: ReadonlyMap<K, V>): readonly (readonly [K, V])[] =>
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        keys(orderingComparer)(map).map(key => [key, map.get(key)!])

/**
 * Also commonly referred to as `fold` or `aggregate`. Applies each key/value
 * pair in the map to a "reducer" (or "folding") function to build up a final
 * accumulated value.
 *
 * Key/value pairs will be given to the reducer function based on the sort-order
 * of the keys. That order can be specified by passing the `OrderingComparer`.
 * Defaults to the standard ASCII-based sort.
 *
 * @category Transformations
 * @category Utils
 *
 * @param f
 * The reducer function. Accepts the accumulator value, the key, and the value and
 * produces the next incremental accumulator value.
 */
const reduce =
    <S, K, V>(
        init: S,
        f: (acc: S, k: K, v: V) => S,
        orderingComparer: OrderingComparer<K> = defaultOrderingComparer
    ) =>
    (map: ReadonlyMap<K, V>): S =>
        toArray(orderingComparer)(map).reduce((s, [k, v]) => f(s, k, v), init)

/**
 * Like {@link reduce}, but the key-value pairs are passed to the reducer in
 * _reverse_ sort-order.
 */
const reduceRight =
    <S, K, V>(
        init: S,
        f: (acc: S, k: K, v: V) => S,
        orderingComparer: OrderingComparer<K> = defaultOrderingComparer
    ) =>
    (map: ReadonlyMap<K, V>): S =>
        toArray(orderingComparer)(map).reduceRight((s, [k, v]) => f(s, k, v), init)

/**
 * Get a new map containing only the key/value pairs for which the given
 * predicate function returns `true`.
 *
 * @category Transformations
 * @category Filtering
 */
const filter =
    <K, V>(f: (k: K, v: V) => boolean) =>
    (map: ReadonlyMap<K, V>): ReadonlyMap<K, V> => {
        if (map.size < 1) {
            return empty()
        }

        const out = empty<K, V>()

        for (const [k, v] of map) {
            if (f(k, v)) {
                out.set(k, v)
            }
        }

        return out
    }

/**
 * Test whether every key/value pair in a map returns `true` for the
 * given predicate function.
 *
 * @category Utils
 */
const every =
    <K, V>(f: (k: K, v: V) => boolean) =>
    (map: ReadonlyMap<K, V>): boolean => {
        if (map.size < 1) {
            return true
        }

        for (const [k, v] of map) {
            if (!f(k, v)) {
                return false
            }
        }

        return true
    }

/**
 * Execute an arbitrary side-effect function for every key/value pair in the map.
 * Does not affect the values contained in the map. Can be helpful for logging
 * or debugging.
 *
 * @category Utils
 *
 * @param f Should not mutate its arguments. See {@link map} if you want to
 * transform the map into a new map.
 *
 * @returns void
 */
const iter =
    <K, V>(f: (k: K, v: V) => void) =>
    (map: ReadonlyMap<K, V>): void => {
        if (map.size < 1) {
            return
        }

        for (const [k, v] of map) {
            f(k, v)
        }
    }

/**
 * Convert an array of tuples into a map of key/value pairs.
 *
 * @category Constructors
 */
const ofArray = <K, V>(
    array: readonly (readonly [K, V])[],
    equalityComparer: EqualityComparer<K> = defaultEqualityComparer
): ReadonlyMap<K, V> => {
    if (array.length < 1) {
        return new globalThis.Map()
    }

    return array.reduce<ReadonlyMap<K, V>>(
        (map, kvp) => add(kvp, equalityComparer)(map),
        empty()
    )
}

/**
 * Remove the given key from the map. Will use the `EqualityComparer` if passed,
 * otherwise defaults to reference equality (triple equals). The map will be
 * returned unchanged if the key is not found in the map.
 *
 * @category Transformations
 */
const remove =
    <K>(key: K, equalityComparer: EqualityComparer<K> = defaultEqualityComparer) =>
    <V>(map: ReadonlyMap<K, V>) =>
        pipe(
            map,
            findWithKey(key, equalityComparer),
            Option.match({
                some: ([k]) => {
                    const copy = new globalThis.Map(map)
                    copy.delete(k)
                    return copy
                },
                none: map,
            })
        )

/**
 * Convert a `Record` object into a map of key/value pairs. Uses `Object.entries`
 * under-the-hood, so keep in mind there are some gotchas about what comprise
 * an object's "own, enumerable" properties. Designed primarily to be used for
 * simple objects like those deserialized from a JSON blob, for instance.
 *
 * Will use the given `EqualityComparer` to determine key uniqueness if given.
 * Otherwise, defaults to reference equality (triple equals).
 *
 * @category Constructors
 */
const ofRecord = <K extends string, V>(
    record: Record<K, V>,
    equalityComparer: EqualityComparer<K> = defaultEqualityComparer
) =>
    Object.entries<V>(record).reduce<ReadonlyMap<K, V>>(
        (map, [k, v]) => add([k as K, v], equalityComparer)(map),
        empty()
    )

export const Map = {
    exists,
    containsKey,
    findWithKey,
    find,
    findKey,
    add,
    remove,
    change,
    map,
    filter,
    every,
    iter,
    empty,
    size,
    isEmpty,
    reduce,
    reduceRight,
    toArray,
    ofArray,
    ofRecord,
    keys,
    values,
}
