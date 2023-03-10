/**
 * The `Async` type reperesents a "lazy" or "cold" asynchronous
 * operation. This is in contrast to the default behavior of the
 * `Promise` type, which is "hot" by nature. That is, once you have
 * instantiated a `Promise`, whatever asynchronous work it represents
 * has already begun.
 *
 * The `Async` type is intended to be used to model computations that
 * should never fail. (meaning, if a failure occurs, it is likely an
 * exceptional case and throwing an Error makes sense.) If you need
 * to model asynchronous computations that may fail, please see `AsyncResult`.
 *
 * The primary motivation for using a "cold" `Async` type is to
 * enable things like deciding whether to use in-parallel or in-series
 * sequencing, and for avoiding unnecessary work. (i.e., if an `Async`
 * is constructed, but never started, no work is performed.)
 *
 * This API has been designed for use with `pipe`.
 *
 * @example
 * await pipe(
 *     [
 *         async () => await doExpensiveThing1(),
 *         async () => await doExpensiveThing2(),
 *     ], // Async<string>[]
 *     Async.sequential, // Async<readonly string[]>
 *     Async.map(Array.map(s => s.toLowerCase())), // Async<readonly string[]>
 *     Async.start // Promise<readonly string[]>
 * ); // yields ["completed expensive thing 1", "completed expenseive thing 2"]
 */
export interface Async<A> {
    (): Promise<A>
}

/**
 * Constructs an Async from a raw value. Primarily useful for
 * writing tests, or for coercing some value into an Async for
 * use in a pipeline.
 *
 * @example
 * await Async.of(42)(); // yields `42`
 */
const of =
    <A>(a: A): Async<A> =>
    () =>
        Promise.resolve(a)

/** Projects the inner value using the given function.
 *
 * @example
 * declare const getSecretValueFromApi: () => Promise<number>
 *
 * await pipe(
 *     getSecretValueFromApi,   // assume always returns 1
 *     Async.map(n => n + 100), // Async<number>
 *     Async.start              // Promise<number>
 * ); // yields `101`
 */
const map =
    <A, B>(f: (a: A) => B) =>
    (async: Async<A>): Async<B> =>
    () =>
        async().then(f)

/** Projects the inner value using the given function,
 * which itself returns an `Async`, and flattens the result.
 *
 * @example
 * await pipe(
 *     Async.of("a"),
 *     Async.bind(s => Async.of(`${s}+b`)),
 *     Async.start
 * ); // yields "a+b"
 */
const bind =
    <A, B>(f: (a: A) => Async<B>) =>
    (async: Async<A>): Async<B> =>
    () =>
        async().then(a => f(a)())

/** Unwraps a "nested" `Async` structure so that the inner
 * value is only "wrapped" in a single `Async`.
 *
 * @example
 * const nested = Async.of(Async.of(30)); // Async<Async<number>>
 * const flattened = Async.flatten(nested); // Async<number>
 */
const flatten =
    <A>(async: Async<Async<A>>): Async<A> =>
    () =>
        async().then(inner => inner())

/** An `Async` of an arbitrary non-nullish value. Useful
 * primarily for adding delays at the beginning of a pipeline,
 * e.g. (see below)
 *
 * @example
 * pipe(
 *     Async.unit,
 *     Async.delay(5000), // wait 5 seconds
 *     Async.map(console.log)
 * ); // logs `{}` after 5 seconds
 */
const unit: Async<Record<string, never>> = of({})

/** Adds an abitrary delay in milliseconds before the completion
 * of the `Async` computation.
 *
 * @param delayInMilliseconds always normalized to a natural number
 *
 * @example
 * pipe(
 *     Async.unit,
 *     Async.delay(5000), // wait 5 seconds
 *     Async.map(console.log)
 * ); // logs `{}` after 5 seconds
 */
const delay =
    (delayInMilliseconds: number) =>
    <A>(async: Async<A>): Async<A> =>
    async () => {
        const delay = delayInMilliseconds <= 0 ? 0 : Math.floor(delayInMilliseconds)
        await new Promise(resolve => setTimeout(resolve, delay))

        return await async()
    }

/** Converts an array of `Async` computations into one `Async` computation
 * which represents the in-series execution of each of the given `Async` values.
 *
 * Order is guaranteed: the order of the given computations will be
 * preserved in the resultant array.
 */
const sequential =
    <A>(asyncs: readonly Async<A>[]): Async<readonly A[]> =>
    async () => {
        const results: A[] = []

        for (let i = 0; i < asyncs.length; i++) {
            results.push(await asyncs[i]())
        }

        return results
    }

/** Equivalent to simply invoking the async. Convenience function
 * for more expressive function pipelines.
 *
 * @example
 * // simply invoke
 * const a = Async.of(1)();
 * // use a named function, useful for pipelining
 * const b = pipe(
 *     Async.of(1),
 *     Async.start
 * );
 */
const start = <A>(async: Async<A>): Promise<A> => async()

/** Converts an array of `Async` computations into one `Async` computation
 * which represents the in-parallel execution of all the given `Async` values.
 * Order is not guaranteed.
 *
 * This is effectively an alias for `Promise.all`.
 */
const parallel =
    <A>(asyncs: readonly Async<A>[]): Async<readonly A[]> =>
    () =>
        Promise.all(asyncs.map(start))

/** Wraps a `Promise` inside an `Async`. **Note:** this does not mean that
 * the given promise is made "cold." By definition, the given `Promise`
 * is already "hot" when it is passed to this function.
 *
 * If you want to convert a function that returns a `Promise` into a function
 * that returns an `Async`, see `asyncify`.
 *
 * @example
 * declare const safeWriteToFile: (content: string) => Promise<number>;
 * // The promise is always "hot" as soon as it is instantiated
 * const statusPromise = safeWriteToFile("I love cheese"); // Promise<number>
 * const statusAsync = Async.ofPromise(statusPromise); // Async<number>
 */
const ofPromise =
    <A>(promise: Promise<A>): Async<A> =>
    () =>
        promise

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Convert a function that returns a `Promise` into one that returns
 * an `Async` instead.
 */
const asyncify =
    <F extends (...args: any[]) => Promise<any>>(
        f: F
    ): ((...args: Parameters<F>) => Async<Awaited<ReturnType<F>>>) =>
    (...args: Parameters<F>) =>
    () =>
        f(...args)
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Allows executing an arbitrary side-effect within a pipeline of
 * `Async` functions, e.g., for logging. Passes the inner value
 * through unchanged.
 *
 * @param f should not mutate its arguments
 *
 * @example
 * await pipe(
 *     Async.of(20),
 *     Async.delay(2_000),
 *     Async.tee(console.log), // logs `20` after 2 seconds
 *     Async.map(double), // double receives the un-altered value `20`
 *     Async.start
 * ); // yields `40` after 2 seconds
 */
const tee =
    <A>(f: (a: A) => void) =>
    (async: Async<A>): Async<A> =>
    async () => {
        const a = await async()
        f(a)
        return a
    }

/**
 * An `Async` computation that never resolves. Primarily useful
 * for writing test code.
 */
const never: Async<never> = () =>
    new Promise(() => {
        return
    })

export const Async = {
    of,
    map,
    bind,
    flatten,
    sequential,
    parallel,
    start,
    ofPromise,
    delay,
    unit,
    asyncify,
    never,
    tee,
}
