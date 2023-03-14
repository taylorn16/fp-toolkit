import { describe, it, expect } from "vitest"
import { AsyncResult } from "../src/AsyncResult"
import { Async } from "../src/Async"
import { Result } from "../src/Result"
import { pipe } from "../src/composition"

describe("AsyncResult", () => {
    describe("constructors", () => {
        describe("Ok", () => {
            it("produces a new Ok", async () => {
                expect(await pipe(AsyncResult.ok(30), Async.start)).toStrictEqual(
                    Result.ok(30)
                )
            })
        })

        describe("Err", () => {
            it("produces a new Err", async () => {
                expect(await pipe(AsyncResult.err("err"), Async.start)).toStrictEqual(
                    Result.err("err")
                )
            })
        })
    })

    describe("map", () => {
        it("projects the inner Ok value", async () => {
            expect(
                await pipe(
                    AsyncResult.ok(10),
                    AsyncResult.map(n => n + 1),
                    Async.start
                )
            ).toStrictEqual(Result.ok(11))
        })

        it("does nothing to an Err", async () => {
            expect(
                await pipe(
                    AsyncResult.err(10),
                    AsyncResult.map((n: number) => n + 1),
                    Async.start
                )
            ).toStrictEqual(Result.err(10))
        })
    })

    describe("mapErr", () => {
        it("projects the inner Err value", async () => {
            expect(
                await pipe(
                    AsyncResult.err("err"),
                    AsyncResult.mapErr(s => s.length),
                    Async.start
                )
            ).toStrictEqual(Result.err(3))
        })

        it("does nothing to an Ok", async () => {
            expect(
                await pipe(
                    AsyncResult.ok(10),
                    AsyncResult.mapErr((n: number) => n + 1),
                    Async.start
                )
            ).toStrictEqual(Result.ok(10))
        })
    })

    describe("mapBoth", () => {
        it("projects the inner Ok value on Ok", async () => {
            expect(
                await pipe(
                    AsyncResult.ok<number, string>(25),
                    AsyncResult.mapBoth(
                        n => n * 2,
                        s => s.length
                    ),
                    Async.start
                )
            ).toStrictEqual(Result.ok(50))
        })

        it("projects the inner Err value on Err", async () => {
            expect(
                await pipe(
                    AsyncResult.err<string, number>("failure"),
                    AsyncResult.mapBoth(
                        n => n * 2,
                        s => s.length
                    ),
                    Async.start
                )
            ).toStrictEqual(Result.err(7))
        })
    })

    describe("bind", () => {
        it("projects the inner Ok value and flattens the result", async () => {
            // arrange
            const f1 = () => AsyncResult.ok<string, Error>("ok")
            const f2 = (s: string) => AsyncResult.ok<number, Error>(s.length)
            // act
            const actual = await pipe(f1(), AsyncResult.bind(f2), Async.start)
            // assert
            expect(actual).toStrictEqual(Result.ok(2))
        })

        it("does nothing to Err values", async () => {
            // arrange
            const f1 = () => AsyncResult.err<Error, string>(new Error("err"))
            const f2 = (s: string) => AsyncResult.ok<number, Error>(s.length)
            // act
            const actual = await pipe(f1(), AsyncResult.bind(f2), Async.start)
            // assert
            expect(actual).toStrictEqual(Result.err(new Error("err")))
        })

        it("returns a flattened Err if the bind projection returns an Err", async () => {
            // arrange
            const f1 = () => AsyncResult.ok<string, Error>("ok")
            const f2 = (_: string) => AsyncResult.err<Error, number>(new Error("err"))
            // act
            const actual = await pipe(f1(), AsyncResult.bind(f2), Async.start)
            // assert
            expect(actual).toStrictEqual(Result.err(new Error("err")))
        })
    })

    describe("bindResult", () => {
        it("projects the inner Ok value and flattens the result", async () => {
            // arrange
            const f1 = () => AsyncResult.ok<string, Error>("ok")
            const f2 = (s: string) => Result.ok<number, Error>(s.length)
            // act
            const actual = await pipe(f1(), AsyncResult.bindResult(f2), Async.start)
            // assert
            expect(actual).toStrictEqual(Result.ok(2))
        })

        it("does nothing to Err values", async () => {
            // arrange
            const f1 = () => AsyncResult.err<Error, string>(new Error("err"))
            const f2 = (s: string) => Result.ok<number, Error>(s.length)
            // act
            const actual = await pipe(f1(), AsyncResult.bindResult(f2), Async.start)
            // assert
            expect(actual).toStrictEqual(Result.err(new Error("err")))
        })

        it("returns a flattened Err if the bind projection returns an Err", async () => {
            // arrange
            const f1 = () => AsyncResult.ok<string, Error>("ok")
            const f2 = (_: string) => Result.err<Error, number>(new Error("err"))
            // act
            const actual = await pipe(f1(), AsyncResult.bindResult(f2), Async.start)
            // assert
            expect(actual).toStrictEqual(Result.err(new Error("err")))
        })
    })

    describe("ofResult", () => {
        it("lifts a result into an AsyncResult", async () => {
            expect(
                await pipe(Result.err("failure"), AsyncResult.ofResult, Async.start)
            ).toStrictEqual(Result.err("failure"))
        })
    })

    describe("ofAsync", () => {
        it("lifts an Async into an AsyncResult", async () => {
            expect(
                await pipe(Async.of(25), AsyncResult.ofAsync, Async.start)
            ).toStrictEqual(Result.ok(25))
        })
    })

    describe("tryCatch", () => {
        it("returns an Ok if the computation does not throw", async () => {
            // arrange
            const f = Async.of(12)
            // act
            const actual = await pipe(f, AsyncResult.tryCatch, Async.start)
            // assert
            expect(actual).toStrictEqual(Result.ok(12))
        })

        it("returns an Err if the computation throws", async () => {
            // arrange
            const f = async () => {
                throw new Error("failure")
            }
            // act
            const actual = await pipe(f, AsyncResult.tryCatch, Async.start)
            // assert
            expect(actual).toStrictEqual(Result.err(new Error("failure")))
        })

        it("coerces thrown non-error objects to a stringified error by default", async () => {
            // arrange
            const f = async () => {
                throw "failure"
            }
            // act
            const actual = await pipe(f, AsyncResult.tryCatch, Async.start)
            // assert
            expect(actual).toStrictEqual(Result.err(new Error("failure")))
        })

        it("uses the onThrow function if given", async () => {
            // arrange
            const f = async (): Promise<number> => {
                throw "failure"
            }

            const onThrow = (u: unknown) => ({ err: String(u) })
            // act
            const actual = await pipe(AsyncResult.tryCatch(f, onThrow), Async.start)
            // assert
            expect(actual).toStrictEqual(Result.err({ err: "failure" }))
        })
    })

    describe("match", () => {
        it("matches Ok using a lambda", async () => {
            // arrange
            const matcher = {
                ok: (n: number) => n + 100,
                err: (s: string) => s.length,
            }
            // act
            const actual = await pipe(
                AsyncResult.ok<number, string>(10),
                AsyncResult.match(matcher),
                Async.start
            )
            // assert
            expect(actual).toBe(110)
        })

        it("matches Ok using a raw value", async () => {
            // arrange
            const matcher = {
                ok: 99,
                err: (s: string) => s.length,
            }
            // act
            const actual = await pipe(
                AsyncResult.ok<number, string>(10),
                AsyncResult.match(matcher),
                Async.start
            )
            // assert
            expect(actual).toBe(99)
        })

        it("matches Err using a lambda", async () => {
            // arrange
            const matcher = {
                ok: (n: number) => n + 100,
                err: (s: string) => s.length,
            }
            // act
            const actual = await pipe(
                AsyncResult.err<string, number>("fail"),
                AsyncResult.match(matcher),
                Async.start
            )
            // assert
            expect(actual).toBe(4)
        })

        it("matches Err using a raw value", async () => {
            // arrange
            const matcher = {
                ok: "",
                err: "argh!",
            }
            // act
            const actual = await pipe(
                AsyncResult.err<string, number>(""),
                AsyncResult.match(matcher),
                Async.start
            )
            // assert
            expect(actual).toBe("argh!")
        })
    })

    describe("start", () => {
        it("invokes the AsyncResult", async () => {
            expect(await pipe(AsyncResult.ok("A"), AsyncResult.start)).toStrictEqual(
                Result.ok("A")
            )
        })
    })
})
