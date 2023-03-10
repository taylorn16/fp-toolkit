/* eslint-disable @typescript-eslint/no-empty-interface */
import { Tagged, assertExhaustive } from "./prelude"
import { Option } from "./Option"
import { flow } from "./composition"

interface Ok<A> extends Tagged<"Ok", { ok: A }> {}
interface Err<E> extends Tagged<"Err", { err: E }> {}

/** The `Result` type represents the outcome of a completed operation
 * that either succeeded with some `Ok` value (also called a "success"
 * or "right" value), or failed with some `Err` value (also called a
 * "failure" or "left" value).
 *
 * Generally speaking, `Result` is not intended to _replace_ exception
 * handling, but to augment it, so that exceptions can be used to handle
 * truly exceptional things. (i.e., Is it really exceptional that a
 * network request failed?)
 *
 * This API has been designed to work with `pipe`.
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

/** Constructs a new Ok instance with the given ok value. */
const Ok = <A, E = never>(ok: A): Result<A, E> => ({
    _tag: "Ok",
    ok,
})

/** Constructs a new Err instance with the given err value. */
const Err = <E, A = never>(err: E): Result<A, E> => ({
    _tag: "Err",
    err,
})

/** Alias for the Ok constructor. */
const of = Ok

interface ResultMatcher<A, E, R> {
    readonly ok: R | ((ok: A) => R)
    readonly err: R | ((err: E) => R)
}

const isRawValue = <A, E, R>(caseFn: R | ((ok: A) => R) | ((err: E) => E)): caseFn is R =>
    typeof caseFn !== "function"

const getMatcherResult = <T, R>(match: ((t: T) => R) | R, arg: T) =>
    isRawValue(match) ? match : match(arg)

/** Pattern match against a `Result` to "unwrap" its inner value.
 * Pass a matcher function with cases for `ok` and `err` that can
 * either be lambdas or raw values.
 *
 * Enforces exhaustive case matching.
 *
 * @example
 * pipe(
 *     Result.Err("failure"),
 *     Result.match({
 *         ok: a => `${a.length}`,
 *         err: s => `${s}!`
 *     })
 * ); // "failure!"
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

/** If the `Result` is `Ok`, projects the inner value using
 * the given function, returning a new `Result`. Passes
 * `Err` values through unchanged.
 *
 * @example
 * pipe(
 *     Result.Ok(2),
 *     Result.map(n => n + 3)
 * ); // yields `Result.Ok(5)`
 */
const map = <A, E, B>(f: (a: A) => B) =>
    match<A, E, Result<B, E>>({
        ok: a => Ok(f(a)),
        err: e => Err(e),
    })

/** If the `Result` is `Err`, projects the error value using
 * the given function and returns a new `Result`. `Ok` values
 * are passed through unchanged.
 *
 * @example
 * pipe(
 *     Result.Err("cheese melted"),
 *     Result.mapErr(s => s.length)
 * ); // yields `Result.Err(13)`
 */
const mapErr = <A, Ea, Eb>(f: (e: Ea) => Eb) =>
    match<A, Ea, Result<A, Eb>>({
        ok: a => Ok(a),
        err: e => Err(f(e)),
    })

/** Map both branches of the Result by specifying a lambda
 * to use in either case. Equivalent to calling `map` followed
 * by `mapErr`.
 */
const mapBoth = <A1, E1, A2, E2>(mapOk: (a: A1) => A2, mapErr: (e: E1) => E2) =>
    match<A1, E1, Result<A2, E2>>({
        ok: a => Ok(mapOk(a)),
        err: e => Err(mapErr(e)),
    })

/** Returns the inner Ok value or the given default value
 * if the Result is an Err.
 */
const defaultValue = <A, E = unknown>(a: A) =>
    match<A, E, A>({
        ok: a => a,
        err: a,
    })

/** Returns the inner Ok value or uses the given lambda
 * to compute the default value if the Result is an Err.
 */
const defaultWith = <A, E = unknown>(f: () => A) =>
    match<A, E, A>({
        ok: a => a,
        err: f,
    })

/** Projects the inner Ok value using a function that
 * itself returns a Result, and flattens the result.
 * Errs are passed through unchanged.
 *
 * @example
 * pipe(
 *     Result.Ok("a"),
 *     Result.bind(s =>
 *         s === "a" ? Result.Ok("got an a!") : Result.Err("not an a")
 *     ),
 *     Result.defualtValue("")
 * ); // yields "got an a!"
 */
const bind = <A, E, B>(f: (a: A) => Result<B, E>) =>
    match<A, E, Result<B, E>>({
        ok: f,
        err: e => Err(e),
    })

/** A type guard that holds if the result is an Ok. Allows the
 * TypeScript compiler to narrow the type and allow safe access
 * to `.ok`.
 */
const isOk = <A, E = unknown>(result: Result<A, E>): result is Ok<A> =>
    result._tag === "Ok"

/** A type guard that holds if the result is an Err. Allows the
 * TypeScript compiler to narrow the type and allow safe access
 * to `.err`.
 */
const isErr = <E, A = unknown>(result: Result<A, E>): result is Err<E> =>
    result._tag === "Err"

/** If given two Ok values, uses the given function and produces a new
 * Ok value with the result. If either of the Results are an Err, returns
 * an Err.
 *
 * If both results are an Err, returns the first one and ignores the second.
 *
 * This is effectively a shortcut to pattern matching a 2-tuple of Results.
 */
const map2 =
    <A, B, C, E>(map: (a: A, b: B) => C) =>
    (results: readonly [Result<A, E>, Result<B, E>]): Result<C, E> => {
        if (isOk(results[0]) && isOk(results[1])) {
            return Ok(map(results[0].ok, results[1].ok))
        } else if (isErr(results[0])) {
            return Err(results[0].err)
        } else {
            return Err((results[1] as Err<E>).err)
        }
    }

/** If given three Ok values, uses the given function and produces a new
 * Ok value with the result. If any of the Results are an Err, returns
 * an Err.
 *
 * If multiple Results are an Err, returns the first one in order and ignores the others.
 *
 * This is effectively a shortcut to pattern matching a 3-tuple of Results.
 */
const map3 =
    <A, B, C, D, E>(map: (a: A, b: B, c: C) => D) =>
    (results: readonly [Result<A, E>, Result<B, E>, Result<C, E>]): Result<D, E> => {
        if (isOk(results[0]) && isOk(results[1]) && isOk(results[2])) {
            return Ok(map(results[0].ok, results[1].ok, results[2].ok))
        } else if (isErr(results[0])) {
            return Err(results[0].err)
        } else if (isErr(results[1])) {
            return Err(results[1].err)
        } else {
            return Err((results[2] as Err<E>).err)
        }
    }

/** Attemps to invoke a function that may throw. If the function
 * succeeds, returns an Ok with the result. If the function throws,
 * returns an Err containing the thrown Error, optionally transformed.
 *
 * @param onThrow Optional. If given, accepts the thrown `unknown` object and
 * produces the Err branch. If omitted, the thrown object will be stringified
 * and wrapped in a new Error instance if it is not already an Error instance.
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
        return Ok(mightThrow())
    } catch (err) {
        if (onThrow != null) {
            return Err(onThrow(err))
        }
        return Err(toError(err))
    }
}

/** Allows some arbitrary side-effect function to be called
 * using the wrapped Ok value. Useful for trace logging.
 *
 * @param f should not mutate its arguments. Use `map` if you
 * want to project the inner value of the Result instead.
 *
 * @example
 * pipe(
 *     Result.Ok(23),
 *     Result.tee(console.log), // logs `23`
 *     Result.map(n => n + 1), // inner value is unchanged
 *     Result.defaultValue(0)
 * ); // yields `24`
 */
const tee = <A, E>(f: (a: A) => void) =>
    match<A, E, Result<A, E>>({
        ok: a => {
            f(a)
            return Ok(a)
        },
        err: Err,
    })

/** Allows some arbitrary side-effect function to be called
 * using the wrapped Err value. Useful for trace logging.
 *
 * @param f should not mutate its arguments
 *
 * @example
 * pipe(
 *     Result.Err("melted"),
 *     Result.teeErr(console.log), // logs `melted`
 *     Result.mapErr(s => s.length), // inner value is unchanged
 * ); // yields Result.Err(6)
 */
const teeErr = <A, E>(f: (e: E) => void) =>
    match<A, E, Result<A, E>>({
        ok: Ok,
        err: e => {
            f(e)
            return Err(e)
        },
    })

/**
 * Converts an `Option` to a `Result`.
 *
 * @param onNone used to convert a `None` branch into an `Err` branch
 * @returns a new `Result`
 */
const ofOption = <A, E>(onNone: () => E) =>
    Option.match<A, Result<A, E>>({
        some: Ok,
        none: flow(onNone, Err),
    })

export const Result = {
    Ok,
    of,
    Err,
    isOk,
    isErr,
    match,
    map,
    map2,
    map3,
    mapErr,
    mapBoth,
    bind,
    defaultValue,
    defaultWith,
    tryCatch,
    tee,
    teeErr,
    ofOption,
}
