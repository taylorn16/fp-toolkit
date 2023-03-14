/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-empty-interface */
import { Tagged, assertExhaustive } from "./prelude"
import { Option } from "./Option"
import { flow, pipe } from "./composition"

export interface Ok<A> extends Tagged<"Ok", { ok: A }> {}
export interface Err<E> extends Tagged<"Err", { err: E }> {}

/**
 * The `Result` type represents the outcome of a completed operation
 * that either succeeded with some `Ok` value (also called a "success"
 * or "right" value), or failed with some `Err` value (also called a
 * "failure" or "left" value).
 *
 * Generally speaking, `Result` is not intended to _replace_ exception
 * handling, but to augment it, so that exceptions can be used to handle
 * truly _exceptional_ things. (i.e., Is it really exceptional that a
 * network request failed?)
 *
 * This API has been optimized for use with left-to-right function composition
 * using {@link pipe} and {@link flow}.
 *
 * @example
 * pipe(
 *     Result.tryCatch(() => readFileMightThrow()),
 *     Result.mapErr(FileError.create),
 *     Result.bind(fileText => pipe(
 *         Result.tryCatch(() => transmitMightThrow(fileText)),
 *         Result.mapErr(FileError.create)
 *     )),
 *     Result.map(transmitResponse => transmitResponse?.status),
 *     Result.defaultValue("failed")
 * );
 * // may return, e.g., "pending" if everything worked
 * // or "failed" if something fell down along the way
 */
export type Result<A, E> = Ok<A> | Err<E>

/**
 * Construct a new Ok instance.
 *
 * @category Constructors
 *
 * @returns A new Ok instance containing the given value.
 */
const ok = <A, E = never>(ok: A): Result<A, E> => ({
    _tag: "Ok",
    ok,
})

/**
 * Construct a new Err instance.
 *
 * @category Constructors
 *
 * @returns A new Err instance with the given value. */
const err = <E, A = never>(err: E): Result<A, E> => ({
    _tag: "Err",
    err,
})

/**
 * Alias for {@link ok}.
 */
const of = ok

interface ResultMatcher<A, E, R> {
    readonly ok: R | ((ok: A) => R)
    readonly err: R | ((err: E) => R)
}

const isRawValue = <A, E, R>(caseFn: R | ((ok: A) => R) | ((err: E) => E)): caseFn is R =>
    typeof caseFn !== "function"

const getMatcherResult = <T, R>(match: ((t: T) => R) | R, arg: T) =>
    isRawValue(match) ? match : match(arg)

/**
 * Exhaustive pattern match against a `Result` to "unwrap" its inner
 * value. Pass a matcher function with cases for `ok` and `err` that
 * can either be lambdas or raw values.
 *
 * @category Pattern Matching
 *
 * @example
 * pipe(
 *     Result.Err("failure"),
 *     Result.match({
 *         ok: a => `${a.length}`,
 *         err: s => `${s}!`
 *     })
 * ) // "failure!"
 */
const match =
    <A, E, R>(matcher: ResultMatcher<A, E, R>) =>
    (result: Result<A, E>) => {
        switch (result._tag) {
            case "Ok":
                return getMatcherResult(matcher.ok, result.ok)
            case "Err":
                return getMatcherResult(matcher.err, result.err)
            /* c8 ignore next 2 */
            default:
                return assertExhaustive(result)
        }
    }

/**
 * Map the inner `Ok` value using the given function and
 * return a new `Result`. Passes `Err` values through as-is.
 *
 * @category Mapping
 *
 * @example
 * pipe(
 *     Result.Ok(2),
 *     Result.map(n => n + 3)
 * ) // Result.Ok(5)
 */
const map =
    <A, B>(f: (a: A) => B) =>
    <E>(result: Result<A, E>) =>
        pipe(
            result,
            match({
                ok: a => ok(f(a)),
                err: e => err(e),
            })
        )

/**
 * Map the inner `Err` value using the given function and
 * return a new `Result`. `Ok` values are passed through as-is.
 *
 * @category Mapping
 *
 * @example
 * pipe(
 *     Result.Err("cheese melted"),
 *     Result.mapErr(s => s.length)
 * ) // Result.Err(13)
 */
const mapErr =
    <E1, E2>(f: (e: E1) => E2) =>
    <A>(result: Result<A, E1>) =>
        pipe(
            result,
            match({
                ok: a => ok(a),
                err: e => err(f(e)),
            })
        )

/**
 * Map both branches of the Result by specifying a lambda
 * to use in either case. Equivalent to calling {@link map} followed
 * by {@link mapErr}.
 */
const mapBoth = <A1, E1, A2, E2>(mapOk: (a: A1) => A2, mapErr: (e: E1) => E2) =>
    match<A1, E1, Result<A2, E2>>({
        ok: a => ok(mapOk(a)),
        err: e => err(mapErr(e)),
    })

/**
 * Return the inner `Ok` value or the given default value
 * if the Result is an Err.
 *
 * @category Pattern Matching
 */
const defaultValue =
    <A>(a: A) =>
    <E>(result: Result<A, E>) =>
        pipe(
            result,
            match({
                ok: a => a,
                err: a,
            })
        )

/**
 * Return the inner `Ok` value or use the given lambda
 * to compute the default value if the `Result` is an `Err`.
 *
 * @category Pattern Matching
 */
const defaultWith =
    <A>(f: () => A) =>
    <E>(result: Result<A, E>) =>
        pipe(
            result,
            match({
                ok: a => a,
                err: f,
            })
        )

/**
 * Maps the inner `Ok` value using a function that
 * also returns a `Result`, and flattens the result.
 * `Err` values are passed through as-is. This function
 * is also referred to as `flatMap`.
 *
 * @category Mapping
 *
 * @example
 * pipe(
 *     Result.Ok("a"),
 *     Result.bind(s =>
 *         s === "a" ? Result.Ok("got an a!") : Result.Err("not an a")
 *     ),
 *     Result.defualtValue("")
 * ) // "got an a!"
 */
const bind = <A, E, B>(f: (a: A) => Result<B, E>) =>
    match<A, E, Result<B, E>>({
        ok: f,
        err: e => err(e),
    })

/** Alias for {@link bind}. */
const flatMap = bind

/**
 * A type guard (a.k.a. `Refinement`) that holds if the result
 * is an `Ok`. Allows the TypeScript compiler to narrow the type
 * and allow type-safe access to `.ok`.
 *
 * @category Type Guards
 */
const isOk = <A, E = never>(result: Result<A, E>): result is Ok<A> => result._tag === "Ok"

/**
 * A type guard (a.k.a. `Refinement`) that holds if the result is
 * an `Err`. Allows the TypeScript compiler to narrow the type and
 * allow safe access to `.err`.
 *
 * @category Type Guards
 */
const isErr = <E, A = never>(result: Result<A, E>): result is Err<E> =>
    result._tag === "Err"

/**
 * Map a tuple of `Result`s.
 *
 * If given two `Ok` values, uses the given mapper function and produces
 * a new `Ok` instance with the result. If either of the `Result`s are an
 * `Err`, returns an `Err`. If both results are an `Err`, returns the first
 * one and ignores the second.
 *
 * @remarks
 * This is effectively a shortcut to pattern matching a 2-tuple of Results.
 *
 * @category Mapping
 */
const map2 =
    <A, B, C>(map: (a: A, b: B) => C) =>
    <E>(results: readonly [Result<A, E>, Result<B, E>]): Result<C, E> => {
        if (isOk(results[0]) && isOk(results[1])) {
            return ok(map(results[0].ok, results[1].ok))
        } else if (isErr(results[0])) {
            return err(results[0].err)
        } else {
            return err((results[1] as Err<E>).err)
        }
    }

/**
 * Map a 3-tuple of `Result`s.
 *
 * If given three `Ok` values, uses the given mapper function and returns
 * a new `Ok` value with the result. If any of the `Result`s are an `Err`,
 * returns an `Err`.
 *
 * If multiple `Result`s are an `Err`, returns the first one found and
 * ignores the others.
 *
 * @remarks
 * This is effectively a shortcut to pattern matching a 3-tuple of Results.
 *
 * @category Pattern Matching
 */
const map3 =
    <A, B, C, D>(map: (a: A, b: B, c: C) => D) =>
    <E>(results: readonly [Result<A, E>, Result<B, E>, Result<C, E>]): Result<D, E> => {
        if (isOk(results[0]) && isOk(results[1]) && isOk(results[2])) {
            return ok(map(results[0].ok, results[1].ok, results[2].ok))
        } else if (isErr(results[0])) {
            return err(results[0].err)
        } else if (isErr(results[1])) {
            return err(results[1].err)
        } else {
            return err((results[2] as Err<E>).err)
        }
    }

/**
 * Attemps to invoke a function that may throw. If the function
 * succeeds, returns an Ok with the result. If the function throws,
 * returns an Err containing the thrown Error, optionally transformed.
 *
 * @category Utils
 *
 * @param onThrow
 * Optional. If given, accepts the thrown `unknown` object and produces
 * the Err branch. If omitted, the thrown object will be stringified and
 * wrapped in a new Error instance if it is not already an Error instance.
 */
function tryCatch<A>(mightThrow: () => A): Result<A, Error>
function tryCatch<A, E = unknown>(
    mightThrow: () => A,
    onThrow: (thrown: unknown) => E
): Result<A, E>
function tryCatch<A, E = unknown>(
    mightThrow: () => A,
    onThrow?: (err: unknown) => E
): Result<A, any> {
    const toError = (err: unknown) => (err instanceof Error ? err : Error(String(err)))

    try {
        return ok(mightThrow())
    } catch (err) {
        if (onThrow != null) {
            return Result.err(onThrow(err))
        }
        return Result.err(toError(err))
    }
}

/**
 * Allows some arbitrary side-effect function to be called
 * using the wrapped `Ok` value. Useful for debugging and logging.
 *
 * @category Utils
 *
 * @param f Should not mutate its arguments. Use {@link map} if you
 * want to map the inner value of the Result instead.
 *
 * @example
 * pipe(
 *     Result.Ok(23),
 *     Result.tee(console.log), // logs `23`
 *     Result.map(n => n + 1), // inner value is unchanged
 *     Result.defaultValue(0)
 * ) // 24
 */
const tee =
    <A>(f: (a: A) => void) =>
    <E>(result: Result<A, E>) =>
        pipe(
            result,
            match({
                ok: a => {
                    f(a)
                    return ok(a)
                },
                err: err,
            })
        )

/**
 * Allows some arbitrary side-effect function to be called
 * using the wrapped `Err` value. Useful for debugging and logging.
 *
 * @param f Should not mutate its arguments. Use {@link mapErr} if
 * you want to mapp the inner `Err` value.
 *
 * @category Utils
 *
 * @example
 * pipe(
 *     Result.Err("melted"),
 *     Result.teeErr(console.log),   // logs `melted`
 *     Result.mapErr(s => s.length), // inner value is unchanged
 * ) // Result.Err(6)
 */
const teeErr =
    <E>(f: (e: E) => void) =>
    <A>(result: Result<A, E>) =>
        pipe(
            result,
            match({
                ok: ok,
                err: e => {
                    f(e)
                    return err(e)
                },
            })
        )

/**
 * Converts an `Option` to a `Result`.
 *
 * @category Constructors
 * @category Utils
 *
 * @param onNone Used to convert a `None` branch into an `Err` branch.
 *
 * @returns a new `Result`.
 */
const ofOption = <A extends {}, E>(onNone: () => E) =>
    Option.match<A, Result<A, E>>({
        some: ok,
        none: flow(onNone, err),
    })

export const Result = {
    ok,
    of,
    err,
    isOk,
    isErr,
    match,
    map,
    map2,
    map3,
    mapErr,
    mapBoth,
    bind,
    flatMap,
    defaultValue,
    defaultWith,
    tryCatch,
    tee,
    teeErr,
    ofOption,
}
