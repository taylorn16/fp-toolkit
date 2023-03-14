/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-empty-interface */
import { Tagged, assertExhaustive, Refinement } from "./prelude"
import { pipe } from "./composition"

export interface Some<A extends {}> extends Tagged<"Some", { some: A }> {}
export interface None extends Tagged<"None", object> {}

/**
 * An `Option` represents a value that is, well, optional—
 * it can either be present or absent. This is particularly
 * useful for modeling nullable values while avoiding the
 * possibility of null reference errors.
 *
 * @category Types
 *
 * @remarks
 * The functions in this module are curried and are optimized
 * for use with left-to-right function composition like `pipe`
 * and `flow`.
 *
 * **Note:** There is a generic type constraint on option that
 * excludes `null`, `undefined`, and `void` types. This is
 * intentional, because `Option<undefined>` or `Option<null>` make
 * little sense conceptually.
 *
 *
 * @example
 * pipe(
 *     56,
 *     Option.ofNullish,
 *     Option.filter(n => n > 50),
 *     Option.map(String),
 *     Option.match({
 *         some: a => `${a}!`,
 *         none: "!"
 *     }),
 *     console.info
 * ); // "56!"
 */
export type Option<A extends {}> = Some<A> | None

/**
 * Creates a new `Some` instance.
 *
 * @category Constructors
 *
 * @returns a new `Some` instance containing the given value
 */
const some = <A extends {}>(some: A): Option<A> => ({
    _tag: "Some",
    some,
})

/**
 * Alias for the Some constructor. See {@link some}.
 *
 * @category Constructors
 */
const of = some

/**
 * The static None instance.
 *
 * @category Constructors
 */
const none: Option<never> = Object.freeze({ _tag: "None" })

type OptionMatcher<A, R> = {
    readonly some: R | ((some: A) => R)
    readonly none: R | (() => R)
}

const isRawValue = <A, R>(caseFn: R | ((ok: A) => R)): caseFn is R =>
    typeof caseFn !== "function"

const getMatcherResult = <T, R>(match: ((t: T) => R) | R, arg: T) =>
    isRawValue(match) ? match : match(arg)

/**
 * Exhaustively pattern match against an `Option` in order
 * to "unwrap" the inner value. Provide either a raw value
 * or lambda to use for each case (`Some` or `None`). This
 * function is curried.
 *
 * @category Pattern Matching
 *
 * @example
 * pipe(
 *     Option.some(42),
 *     Option.match({
 *         some: n => n * 2,
 *         none: 0,
 *     })
 * ) // 84
 */
const match =
    <A extends {}, R>(matcher: OptionMatcher<A, R>) =>
    (option: Option<A>) => {
        switch (option._tag) {
            case "Some":
                return getMatcherResult(matcher.some, option.some)
            case "None":
                return getMatcherResult(matcher.none, void 0)
            /* c8 ignore next 2 */
            default:
                return assertExhaustive(option)
        }
    }

/**
 * Maps the wrapped `Some` value using the given function.
 * Passes through `None` as-is.
 *
 * @category Mapping
 *
 * @example
 * pipe(
 *     Option.some("cheese"),
 *     Option.map(s => s.length),
 *     Option.defaultValue(0)
 * ) // 6
 */
const map = <A extends {}, B extends {}>(f: (a: A) => B) =>
    match<A, Option<B>>({
        some: a => some(f(a)),
        none: none,
    })

/**
 * Tests the wrapped `Some` value using the given predicate.
 * If the wrapped value fails the check, returns `None`.
 * `None` is passed through as-is.
 *
 * @example
 * pipe(
 *     Option.some(70),
 *     Option.filter(n => n <= 25),
 *     Option.defaultValue(0)
 * ) // 0
 */
const filter = <A extends {}>(f: (a: A) => boolean) =>
    match<A, Option<A>>({
        some: a => (f(a) ? some(a) : none),
        none: none,
    })

/**
 * Use a type guard (a.k.a. `Refinement`) to filter the wrapped value.
 * If the type guard holds for the wrapped value, returns `Some` with
 * the narrowed type. `None` is passed through as-is.
 *
 * @category Filtering
 *
 * @example
 * const isString = (u: unknown): u is string => typeof u === "string"
 *
 * pipe(
 *     Option.some("cheese" as any),    // Option<any>
 *     Option.refine(isString),         // Option<string> (type is narrowed by the guard)
 *     Option.map(s => s.length)        // Option<number> (TS infers the type of `s`)
 * )
 */
const refine = <A extends {}, B extends A>(f: Refinement<A, B>) => filter(f)

/**
 * Returns the wrapped value if the `Option` is `Some`,
 * otherwise uses the given value as a default value.
 *
 * @category Pattern Matching
 *
 * @example
 * pipe(
 *     Option.none,
 *     Option.defaultValue("ABC")
 * ) // "ABC"
 */
const defaultValue = <A extends {}>(a: A) =>
    match<A, A>({
        some: a => a,
        none: a,
    })

/**
 * Returns the wrapped value if `Some`. Otherwise, uses the
 * given lambda to compute and return a default value.
 *
 * @category Pattern Matching
 *
 * @example
 * pipe(
 *     Option.some("123"),
 *     Option.defaultWith(() => "")
 * ) // "123"
 */
const defaultWith = <A extends {}>(f: () => A) =>
    match<A, A>({
        some: a => a,
        none: f,
    })

/**
 * Maps an `Option` using a function that returns another
 * `Option` and flattens the result. Sometimes called `flatMap`.
 *
 * @category Mapping
 *
 * @example
 * declare mightFailA: () => Option<string>
 * declare mightFailB: (s: string) => Option<number>
 *
 * pipe(
 *     mightFailA(),                // Option<string>
 *     Option.bind(mightFailB),     // Option<number>
 *     Option.defaultWith(() => 0)  // number
 * );
 * // 200 if both mightFail functions return `Some`
 * // 0 if either function returns `None`
 */
const bind = <A extends {}, B extends {}>(f: (a: A) => Option<B>) =>
    match<A, Option<B>>({
        some: f,
        none: none,
    })

/**
 * Alias of {@link bind}
 *
 * @category Mapping
 */
const flatMap = bind

/**
 * A type guard determinding whether an `Option` instance is a `Some`.
 *
 * @category Type Guards
 */
const isSome = <A extends {}>(o: Option<A>): o is Some<A> => o._tag === "Some"

/**
 * A type guard determining whether an `Option` instance is a `None`.
 *
 * @category Type Guards
 */
const isNone = <A extends {}>(o: Option<A>): o is None => o._tag === "None"

/**
 * Returns a `Some` containing the value returned from the map function
 * if both `Option`s  are `Some`s. Otherwise, returns `None`.
 *
 * This is a kind of shortcut for pattern matching a tuple of `Option`s.
 *
 * @category Mapping
 * @category Pattern Matching
 *
 * @example
 * pipe(
 *     [Option.some(10), Option.some(20)],
 *     Option.map2((a, b) => a + b),
 *     Option.defaultValue(0)
 * ) // 30
 */
const map2 =
    <A extends {}, B extends {}, C extends {}>(map: (a: A, b: B) => C) =>
    (options: readonly [Option<A>, Option<B>]): Option<C> => {
        if (isSome(options[0]) && isSome(options[1])) {
            return some(map(options[0].some, options[1].some))
        }

        return none
    }

/**
 * Returns a Some containing the value returned from the map function
 * if all three `Option`s are `Some`s. Otherwise, returns `None`.
 *
 * This is a kind of shortcut for pattern matching a 3-tuple of `Option`s.
 *
 * @category Mapping
 * @category Pattern Matching
 *
 * @example
 * pipe(
 *     [Option.some(10), Option.some(20), Option.some(30)],
 *     Option.map2((a, b, c) => a + b + c),
 *     Option.defaultValue(0)
 * ) // 60
 */
const map3 =
    <A extends {}, B extends {}, C extends {}, D extends {}>(
        map: (a: A, b: B, c: C) => D
    ) =>
    (options: readonly [Option<A>, Option<B>, Option<C>]): Option<D> => {
        if (isSome(options[0]) && isSome(options[1]) && isSome(options[2])) {
            return some(map(options[0].some, options[1].some, options[2].some))
        }

        return none
    }

/**
 * Constructs an `Option` from a potentially nullish value.
 * Nullish values will result in a `None` instance. Other
 * values will result in a `Some` instance containing the
 * value now constrained to be {@link NonNullable}.
 *
 * @category Constructors
 */
const ofNullish = <A>(a: A): Option<NonNullable<A>> => (a != null ? some(a) : none)

/**
 * Converts an `Option` to a nullish value. (`null | undefined`)
 *
 * @category Pattern Matching
 *
 * @param useNull Defaults to `true`. Specify `false` to use `undefined` instead of `null` for `None`s
 */
const toNullish = <A extends {}>(o: Option<A>, useNull = true): A | null | undefined =>
    pipe(
        o,
        match({
            some: a => a,
            none: useNull ? null : undefined,
        })
    )

/**
 * Attempt to perform a function that may throw. If the
 * function throws, returns `None` and swallows the Error.
 *
 * @category Error Handling
 */
const tryCatch = <A extends {}>(mightThrow: () => A): Option<A> => {
    try {
        return some(mightThrow())
    } catch (_) {
        return none
    }
}

export const Option = {
    some,
    of,
    none,
    ofNullish,
    toNullish,
    match,
    map,
    map2,
    map3,
    bind,
    flatMap,
    defaultValue,
    defaultWith,
    isSome,
    isNone,
    filter,
    refine,
    tryCatch,
}
