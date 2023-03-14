import { describe, it, expect, vi } from "vitest"
import { Result } from "../src/Result"
import { Option } from "../src/Option"
import { pipe } from "../src/composition"

describe("Result", () => {
    describe("constructors", () => {
        describe("Ok", () => {
            it("returns a new Ok object", () => {
                expect(Result.ok("cheese")).toStrictEqual({
                    _tag: "Ok",
                    ok: "cheese",
                })
            })
        })

        describe("Err", () => {
            it("returns a new Err object", () => {
                expect(Result.err("melted")).toStrictEqual({
                    _tag: "Err",
                    err: "melted",
                })
            })
        })
    })

    describe("match", () => {
        it("can match using lambdas", () => {
            // arrange
            const matcher = {
                ok: (s: string) => s.length,
                err: (e: number) => e,
            }
            // act
            const actual1 = pipe(Result.of("stink!"), Result.match(matcher))
            const actual2 = pipe(Result.err(404), Result.match(matcher))
            // assert
            expect(actual1).toBe(6)
            expect(actual2).toBe(404)
        })

        it("can match using raw values", () => {
            // arrange
            const matcher = {
                ok: "ok?",
                err: "err!",
            }
            // act
            const actual1 = pipe(Result.ok("stink!"), Result.match(matcher))
            const actual2 = pipe(Result.err(404), Result.match(matcher))
            // assert
            expect(actual1).toBe("ok?")
            expect(actual2).toBe("err!")
        })

        it("allows nullish matcher values", () => {
            // arrange
            const matcher = {
                ok: null,
                err: undefined,
            }
            // act
            const actual1 = pipe(Result.ok("stink!"), Result.match(matcher))
            const actual2 = pipe(Result.err(404), Result.match(matcher))
            // assert
            expect(actual1).toBe(null)
            expect(actual2).toBe(undefined)
        })

        it("allows falsy matcher values", () => {
            // arrange
            const matcher = {
                ok: 0,
                err: "",
            }
            // act
            const actual1 = pipe(
                Result.ok("stink!"),
                Result.match<string, never, number | string>(matcher)
            )
            const actual2 = pipe(
                Result.err(404),
                Result.match<never, number, number | string>(matcher)
            )
            // assert
            expect(actual1).toBe(0)
            expect(actual2).toBe("")
        })
    })

    describe("map", () => {
        it("returns a mapped Ok if given an Ok", () => {
            expect(
                pipe(
                    Result.ok(55),
                    Result.map(n => n * 2)
                )
            ).toStrictEqual(Result.ok(110))
        })

        it("ignores Err values", () => {
            expect(
                pipe(
                    Result.err("cheese melted"),
                    Result.map((n: number) => n * 2)
                )
            ).toStrictEqual(Result.err("cheese melted"))
        })
    })

    describe("mapErr", () => {
        it("returns a mapped Err if given an Err", () => {
            expect(
                pipe(
                    Result.err(55),
                    Result.mapErr(n => n * 2)
                )
            ).toStrictEqual(Result.err(110))
        })

        it("ignores Ok values", () => {
            expect(
                pipe(
                    Result.ok("cheese"),
                    Result.mapErr((n: number) => n * 2)
                )
            ).toStrictEqual(Result.ok("cheese"))
        })
    })

    describe("map2", () => {
        it("returns the projected value if both results are Ok", () => {
            // arrange
            const concat = (a: string, b: string) => `${a}${b}`
            // act
            const actual = pipe([Result.ok("a"), Result.ok("b")], Result.map2(concat))
            // assert
            expect(actual).toStrictEqual(Result.ok("ab"))
        })

        it.each([
            [[Result.err("err1"), Result.err("err2")], Result.err("err1")],
            [[Result.ok(20), Result.err("err")], Result.err("err")],
            [[Result.err("err"), Result.ok(20)], Result.err("err")],
        ] as const)(
            "returns the first Err if either/both result is Err",
            (
                results: readonly [Result<number, string>, Result<number, string>],
                expected
            ) => {
                // arrange
                const add = (a: number, b: number) => a + b
                // act
                const actual = pipe(results, Result.map2(add))
                // assert
                expect(actual).toStrictEqual(expected)
            }
        )
    })

    describe("map3", () => {
        it("returns the projected value if all three results are Ok", () => {
            // arrange
            const concat = (a: string, b: string, c: string) => `${a}${b}${c}`
            // act
            const actual = pipe(
                [Result.ok("a"), Result.ok("b"), Result.ok("c")],
                Result.map3(concat)
            )
            // assert
            expect(actual).toStrictEqual(Result.ok("abc"))
        })

        it.each([
            [
                [Result.err("err1"), Result.err("err2"), Result.err("err3")],
                Result.err("err1"),
            ],
            [[Result.ok(20), Result.err("err1"), Result.err("err2")], Result.err("err1")],
            [[Result.err("err1"), Result.ok(20), Result.err("err2")], Result.err("err1")],
            [[Result.err("err1"), Result.err("err2"), Result.ok(20)], Result.err("err1")],
            [[Result.err("err"), Result.ok(10), Result.ok(20)], Result.err("err")],
            [[Result.ok(10), Result.ok(20), Result.err("err")], Result.err("err")],
        ] as const)(
            "returns the first found Err if any Result is Err",
            (
                results: readonly [
                    Result<number, string>,
                    Result<number, string>,
                    Result<number, string>
                ],
                expected
            ) => {
                // arrange
                const add = (a: number, b: number, c: number) => a + b + c
                // act
                const actual = pipe(results, Result.map3(add))
                // assert
                expect(actual).toStrictEqual(expected)
            }
        )
    })

    describe("mapBoth", () => {
        it("returns a mapped Err if given an Err", () => {
            expect(
                pipe(
                    Result.err(55),
                    Result.mapBoth(
                        (n: number) => n * 2,
                        n => n + 1
                    )
                )
            ).toStrictEqual(Result.err(56))
        })

        it("returns a mapped Ok if given an Ok", () => {
            expect(
                pipe(
                    Result.ok("cheese"),
                    Result.mapBoth(
                        s => s.length,
                        (s: string) => s.concat("eek")
                    )
                )
            ).toStrictEqual(Result.ok(6))
        })
    })

    describe("defaultValue", () => {
        it("returns the Ok value for Oks", () => {
            expect(pipe(Result.ok(1), Result.defaultValue(0))).toBe(1)
        })

        it("returns the fallback value for Errs", () => {
            expect(pipe(Result.err("cheese"), Result.defaultValue(0))).toBe(0)
        })
    })

    describe("defaultWith", () => {
        it("returns the Ok value for Oks", () => {
            const f = vi.fn()
            expect(pipe(Result.ok(1), Result.defaultWith(f))).toBe(1)
            expect(f).not.toHaveBeenCalled()
        })

        it("returns the fallback value for Errs", () => {
            const f = vi.fn(() => 0)
            expect(pipe(Result.err("cheese"), Result.defaultWith(f))).toBe(0)
            expect(f).toHaveBeenCalledOnce()
        })
    })

    describe("bind", () => {
        it("maps the Ok value to a new Result", () => {
            expect(
                pipe(
                    Result.ok(1),
                    Result.bind(n =>
                        n > 0 ? Result.ok("positive") : Result.err("not positive")
                    ),
                    Result.defaultValue("")
                )
            ).toBe("positive")
        })

        it("does nothing to an Err", () => {
            expect(
                pipe(
                    Result.err("error"),
                    Result.bind((n: number) =>
                        n > 0 ? Result.ok("positive") : Result.err("not positive")
                    )
                )
            ).toStrictEqual(Result.err("error"))
        })
    })

    describe("isOk", () => {
        it("returns true for Ok", () => {
            expect(Result.isOk(Result.ok(1))).toBe(true)
        })

        it("returns false for Err", () => {
            expect(Result.isOk(Result.err(1))).toBe(false)
        })
    })

    describe("isErr", () => {
        it("returns true for Err", () => {
            expect(Result.isErr(Result.err(1))).toBe(true)
        })

        it("returns false for Ok", () => {
            expect(Result.isErr(Result.ok(1))).toBe(false)
        })
    })

    describe("tryCatch", () => {
        it("yields an Ok if the function succeeds", () => {
            // arrange
            const f = () => 22
            // act
            const actual = Result.tryCatch(f)
            // assert
            expect(actual).toStrictEqual(Result.ok(22))
        })

        it.each([
            [new TypeError("type error"), new TypeError("type error")],
            [42, new Error("42")],
        ])(
            "yields an Err if the function throws (using default behavior when onThrow is omitted)",
            (thrown, expected) => {
                // arrange
                const f = () => {
                    throw thrown
                }
                // act
                const actual = Result.tryCatch(f)
                // assert
                expect(actual).toStrictEqual(Result.err(expected))
            }
        )

        it("yields an Err if the function throws (using onThrow when provided)", () => {
            // arrange
            const f = (): number => {
                throw new Error("cheese")
            }
            // act
            const actual = Result.tryCatch(f, () => "aw, shucks")
            // assert
            expect(actual).toStrictEqual(Result.err("aw, shucks"))
        })
    })

    describe("tee", () => {
        it("executes a side effect without affecting the wrapped Ok", () => {
            // arrange
            const log = vi.fn()
            // act
            const actual = pipe(
                Result.ok(20),
                Result.tee(log),
                Result.map(n => n * 3)
            )
            // assert
            expect(actual).toStrictEqual(Result.ok(60))
            expect(log).toHaveBeenCalledOnce()
            expect(log).toHaveBeenCalledWith(20)
        })

        it("does not execute the side effect for an Err", () => {
            // arrange
            const log = vi.fn()
            // act
            const actual = pipe(
                Result.err("err"),
                Result.tee(log),
                Result.map((n: number) => n * 3)
            )
            // assert
            expect(actual).toStrictEqual(Result.err("err"))
            expect(log).not.toHaveBeenCalled()
        })
    })

    describe("teeErr", () => {
        it("executes a side effect without affecting the wrapped Err", () => {
            // arrange
            const log = vi.fn()
            // act
            const actual = pipe(
                Result.err<string, number>("err"),
                Result.teeErr(log),
                Result.mapErr((s: string) => s.length)
            )
            // assert
            expect(actual).toStrictEqual(Result.err(3))
            expect(log).toHaveBeenCalledOnce()
            expect(log).toHaveBeenCalledWith("err")
        })

        it("does not execute the side effect for an Ok", () => {
            // arrange
            const log = vi.fn()
            // act
            const actual = pipe(
                Result.ok("ok"),
                Result.teeErr(log),
                Result.mapErr((n: number) => n * 3)
            )
            // assert
            expect(actual).toStrictEqual(Result.ok("ok"))
            expect(log).not.toHaveBeenCalled()
        })
    })

    describe("ofOption", () => {
        it("returns Ok if given a Some", () => {
            expect(
                pipe(
                    Option.some(100),
                    Result.ofOption(() => "cheese")
                )
            ).toStrictEqual(Result.ok(100))
        })

        it("returns Err if given a None", () => {
            expect(
                pipe(
                    Option.none,
                    Result.ofOption(() => "cheese")
                )
            ).toStrictEqual(Result.err("cheese"))
        })
    })
})
