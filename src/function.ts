/**
 * Execute some arbitrary side-effect function on the given value
 * and return the value unchanged. Sometimes this function is
 * referred to as `tap` or `do`.
 *
 * Used mostly for logging or tracing in function pipelines.
 *
 * @category Utils
 *
 * @example
 * pipe(
 *     42,
 *     tee(console.log), // logs `42`
 *     double,
 *     String
 * )
 * // "84"
 */
export const tee =
    <A>(f: (a: A) => void) =>
    (a: A) => {
        f(a)
        return a
    }

/**
 * Execute some arbitrary side-effect function on the value
 * resolved from the `Promise` and return the value unchanged.
 * Sometimes this function is referred to as `tap` or `do`.
 *
 * Used primarily for logging or tracing in function pipelines.
 *
 * @remarks
 * If you are working with `Async` computations, use {@link Async.tee} instead.
 *
 * @example
 * await pipe(
 *     Promise.resolve(10),
 *     teeAsync(console.log), // logs `10`. Using `tee` would log the Promise object
 *     p => p.then(n => n * 2)
 * ) // 20
 */
export const teeAsync =
    <A>(f: (a: A) => void) =>
    (p: Promise<A>) =>
        p.then(a => {
            f(a)
            return a
        })
