import { describe, it, expect, vi } from "vitest"
import { Map } from "../src/Map"
import { Option } from "../src/Option"
import { String } from "../src/string"
import { pipe } from "../src/composition"
import { EqualityComparer, OrderingComparer } from "../src/prelude"

interface Cheese {
    readonly name: string
    readonly age: number
}

const cheeseByAgeComparer: OrderingComparer<Cheese> = {
    compare: (c1, c2) => (c1.age === c2.age ? 0 : c1.age < c2.age ? -1 : 1),
    equals: (c1, c2) => c1.age === c2.age,
}

const cheeseEqualityComparer: EqualityComparer<Cheese> = {
    equals: (c1, c2) => c1.name === c2.name && c1.age === c2.age,
}

describe("Map", () => {
    describe("add", () => {
        it("adds a new key/value to an empty map", () => {
            expect(pipe(Map.empty(), Map.add(["Albus", 12]))).toStrictEqual(
                Map.ofArray([["Albus", 12]])
            )
        })

        it("adds a new key/value to a non-empty map without the same key using default equality", () => {
            expect(
                pipe(Map.ofArray([["Fido", 44]]), Map.add(["Albus", 12]))
            ).toStrictEqual(
                Map.ofArray([
                    ["Fido", 44],
                    ["Albus", 12],
                ])
            )
        })

        it("overrides a key/value to a non-empty map with the same key using default equality", () => {
            expect(
                pipe(Map.ofArray([["Fido", 44]]), Map.add(["Fido", 12]))
            ).toStrictEqual(Map.ofArray([["Fido", 12]]))
        })

        it("adds a new key/value to a non-empty map without the same key using custom equality", () => {
            expect(
                pipe(
                    Map.ofArray([[{ name: "Gouda", age: 2 }, "AA"]]),
                    Map.add([{ name: "Cheddar", age: 0.5 }, "C"], cheeseEqualityComparer)
                )
            ).toStrictEqual(
                Map.ofArray([
                    [{ name: "Gouda", age: 2 }, "AA"],
                    [{ name: "Cheddar", age: 0.5 }, "C"],
                ])
            )
        })

        it("adds a new key/value to a non-empty map with the same key using custom equality", () => {
            expect(
                pipe(
                    Map.ofArray([[{ name: "Gouda", age: 2 }, "AA"]]),
                    Map.add([{ name: "Gouda", age: 2 }, "B"], cheeseEqualityComparer)
                )
            ).toStrictEqual(Map.ofArray([[{ name: "Gouda", age: 2 }, "B"]]))
        })
    })

    describe("findWithKey", () => {
        it("returns None if the map is empty", () => {
            expect(pipe(new globalThis.Map(), Map.findWithKey("Abby"))).toStrictEqual(
                Option.none
            )
        })

        it("returns None if the key is not in the Map (using default equality)", () => {
            expect(
                pipe(Map.ofArray([["Jared", 25]]), Map.findWithKey("Fubo"))
            ).toStrictEqual(Option.none)
        })

        it("returns Some if the key is in the Map (using default equality)", () => {
            expect(
                pipe(Map.ofArray([["Jared", 25]]), Map.findWithKey("Jared"))
            ).toStrictEqual(Option.some(["Jared", 25]))
        })

        it("returns None if the key is not in the Map (using custom equality)", () => {
            expect(
                pipe(
                    Map.ofArray([[{ name: "Muenster", age: 4 }, 25]]),
                    Map.findWithKey({ name: "Muenster", age: 3 }, cheeseEqualityComparer)
                )
            ).toStrictEqual(Option.none)
        })

        it("returns Some if the key is in the Map (using custom equality)", () => {
            expect(
                pipe(
                    Map.ofArray([[{ name: "Muenster", age: 4 }, 25]]),
                    Map.findWithKey({ name: "Muenster", age: 4 }, cheeseEqualityComparer)
                )
            ).toStrictEqual(Option.some([{ name: "Muenster", age: 4 }, 25]))
        })
    })

    describe("containsKey", () => {
        it.each([
            [true, "e", "in"],
            [false, "f", "not in"],
        ])(
            "returns %o if the key (%s) is %s the map (default equality)",
            (expected, letter) => {
                const letterCounts = Map.ofArray([
                    ["a", 21],
                    ["e", 17],
                ])
                expect(pipe(letterCounts, Map.containsKey(letter))).toBe(expected)
            }
        )

        it.each([
            [true, { name: "Provolone", age: 1.5 }, "in"],
            [false, { name: "Brie", age: 0.5 }, "not in"],
        ])(
            "returns %o if the key (%s) is %s the map (custom equality)",
            (expected, key) => {
                const cheeseRankings = Map.ofArray([
                    [{ name: "Provolone", age: 1.5 }, "A+"],
                    [{ name: "Cheddar", age: 2 }, "B-"],
                ])
                expect(
                    pipe(cheeseRankings, Map.containsKey(key, cheeseEqualityComparer))
                ).toBe(expected)
            }
        )
    })

    describe("find", () => {
        it.each([
            [Option.some(17), "e", "in"],
            [Option.none, "f", "not in"],
        ])(
            "returns the value (%o) if the key (%s) is %s the map (default equality)",
            (expected, letter) => {
                const letterCounts = Map.ofArray([
                    ["a", 21],
                    ["e", 17],
                ])
                expect(pipe(letterCounts, Map.find(letter))).toStrictEqual(expected)
            }
        )

        it.each([
            [Option.some("A+"), { name: "Provolone", age: 1.5 }, "in"],
            [Option.none, { name: "Brie", age: 0.5 }, "not in"],
        ])(
            "returns the value (%o) if the key (%s) is %s the map (custom equality)",
            (expected, key) => {
                const cheeseRankings = Map.ofArray([
                    [{ name: "Provolone", age: 1.5 }, "A+"],
                    [{ name: "Cheddar", age: 2 }, "B-"],
                ])
                expect(
                    pipe(cheeseRankings, Map.find(key, cheeseEqualityComparer))
                ).toStrictEqual(expected)
            }
        )
    })

    describe("map", () => {
        it("returns an empty map if given an empty map", () => {
            expect(
                pipe(
                    Map.empty(),
                    Map.map(() => 0)
                )
            ).toStrictEqual(Map.empty())
        })

        it("returns a new map containing mapped values", () => {
            expect(
                pipe(
                    Map.ofArray([
                        ["John", 23],
                        ["George", 8],
                        ["Jimmy", 88],
                    ]),
                    Map.map((name, age) => `${name}:${age - 3}`)
                )
            ).toStrictEqual(
                Map.ofArray([
                    ["John", "John:20"],
                    ["George", "George:5"],
                    ["Jimmy", "Jimmy:85"],
                ])
            )
        })
    })

    describe("findKey", () => {
        it("returns None for an empty map", () => {
            expect(
                pipe(
                    Map.empty(),
                    Map.findKey((n: number) => n === 20)
                )
            ).toStrictEqual(Option.none)
        })

        it("returns the first key for which the predicate returns true (default sort)", () => {
            expect(
                pipe(
                    Map.ofArray([
                        ["b", 2],
                        ["d", 4],
                        ["a", 1],
                        ["c", 3],
                    ]),
                    Map.findKey(s => s.length === 1)
                )
            ).toStrictEqual(Option.some("a"))
        })

        it("returns None if no key matches the predicate (default sort)", () => {
            expect(
                pipe(
                    Map.ofArray([
                        ["b", 2],
                        ["d", 4],
                        ["a", 1],
                        ["c", 3],
                    ]),
                    Map.findKey(s => s.length === 2)
                )
            ).toStrictEqual(Option.none)
        })

        it("returns the first key for which the predicate returns true (custom sort)", () => {
            expect(
                pipe(
                    Map.ofArray([
                        [{ name: "Mozzarella", age: 2 }, 2],
                        [{ name: "Provolone", age: 1 }, 4],
                        [{ name: "Provolone", age: 0.5 }, 1],
                        [{ name: "Cheddar", age: 3 }, 3],
                    ]),
                    Map.findKey(
                        cheese => cheese.name === "Provolone",
                        cheeseByAgeComparer
                    )
                )
            ).toStrictEqual(Option.some({ name: "Provolone", age: 0.5 }))
        })

        it("returns None if no key matches the predicate (custom sort)", () => {
            expect(
                pipe(
                    Map.ofArray([
                        [{ name: "Mozzarella", age: 2 }, 2],
                        [{ name: "Provolone", age: 1 }, 4],
                        [{ name: "Provolone", age: 0.5 }, 1],
                        [{ name: "Cheddar", age: 3 }, 3],
                    ]),
                    Map.findKey(cheese => cheese.name === "Muenster", cheeseByAgeComparer)
                )
            ).toStrictEqual(Option.none)
        })
    })

    describe("empty", () => {
        it("returns an empty map", () => {
            expect(Map.empty()).toStrictEqual(new globalThis.Map())
        })
    })

    describe("exists", () => {
        it("returns false for an empty map", () => {
            expect(
                pipe(
                    Map.empty(),
                    Map.exists(() => true)
                )
            ).toBe(false)
        })

        it("returns false if no value in the map matches the predicate", () => {
            expect(
                pipe(
                    Map.ofArray([
                        ["Cat", 1],
                        ["Dog", 3],
                        ["Mouse", 0],
                    ]),
                    Map.exists(n => n < 0)
                )
            ).toBe(false)
        })

        it("returns true if at least one value in the map matches the predicate", () => {
            expect(
                pipe(
                    Map.ofArray([
                        ["Cat", 1],
                        ["Dog", 3],
                        ["Mouse", 0],
                    ]),
                    Map.exists(n => n > 2)
                )
            ).toBe(true)
        })
    })

    describe("change", () => {
        describe("default equality", () => {
            it("returns the map unchanged if the key doesn't exist", () => {
                expect(
                    pipe(
                        Map.ofArray([
                            ["Cat", 1],
                            ["Dog", 2],
                        ]),
                        Map.change("Mouse", n => n + 1)
                    )
                ).toStrictEqual(
                    Map.ofArray([
                        ["Cat", 1],
                        ["Dog", 2],
                    ])
                )
            })

            it("returns the map with changed binding if the key does exist", () => {
                expect(
                    pipe(
                        Map.ofArray([
                            ["Cat", 1],
                            ["Dog", 2],
                        ]),
                        Map.change("Dog", n => n + 1)
                    )
                ).toStrictEqual(
                    Map.ofArray([
                        ["Cat", 1],
                        ["Dog", 3],
                    ])
                )
            })
        })

        describe("custom equality", () => {
            it("returns the map unchanged if the key doesn't exist", () => {
                expect(
                    pipe(
                        Map.ofArray([
                            [{ name: "Cheddar", age: 1 }, 1],
                            [{ name: "Mozzarella", age: 0.25 }, 2],
                        ]),
                        Map.change(
                            { name: "Provolone", age: 0 },
                            n => n + 1,
                            cheeseEqualityComparer
                        )
                    )
                ).toStrictEqual(
                    Map.ofArray([
                        [{ name: "Cheddar", age: 1 }, 1],
                        [{ name: "Mozzarella", age: 0.25 }, 2],
                    ])
                )
            })

            it("returns the map with changed binding if the key does exist", () => {
                expect(
                    pipe(
                        Map.ofArray([
                            [{ name: "Cheddar", age: 1 }, 1],
                            [{ name: "Mozzarella", age: 0.25 }, 2],
                        ]),
                        Map.change(
                            { name: "Cheddar", age: 1 },
                            n => n + 1,
                            cheeseEqualityComparer
                        )
                    )
                ).toStrictEqual(
                    Map.ofArray([
                        [{ name: "Cheddar", age: 1 }, 2],
                        [{ name: "Mozzarella", age: 0.25 }, 2],
                    ])
                )
            })
        })
    })

    describe("remove", () => {
        it("removes the key from the map (default equality)", () => {
            expect(
                pipe(
                    Map.ofRecord<string, number>({
                        DinJarin: 10,
                        Meredith: 20,
                        Grogu: 9001,
                    }),
                    Map.remove("Meredith")
                )
            ).toStrictEqual(
                Map.ofArray([
                    ["DinJarin", 10],
                    ["Grogu", 9001],
                ])
            )
        })

        it("doesn't change the map if the key doesn't exist (default equality)", () => {
            expect(
                pipe(
                    Map.ofRecord<string, number>({
                        DinJarin: 10,
                        Grogu: 9001,
                    }),
                    Map.remove("Jimmy")
                )
            ).toStrictEqual(
                Map.ofArray([
                    ["DinJarin", 10],
                    ["Grogu", 9001],
                ])
            )
        })

        it("removes the key from the map (custom equality)", () => {
            expect(
                pipe(
                    Map.ofArray(
                        [
                            [{ name: "American", age: 0.1 }, 0],
                            [{ name: "Provolone", age: 2 }, 23],
                            [{ name: "Sharp Cheddar", age: 3 }, 12],
                        ],
                        cheeseEqualityComparer
                    ),
                    Map.remove({ name: "Provolone", age: 2 }, cheeseEqualityComparer)
                )
            ).toStrictEqual(
                Map.ofArray(
                    [
                        [{ name: "American", age: 0.1 }, 0],
                        [{ name: "Sharp Cheddar", age: 3 }, 12],
                    ],
                    cheeseEqualityComparer
                )
            )
        })

        it("doesn't change the map if the key doesn't exist (custom equality)", () => {
            expect(
                pipe(
                    Map.ofArray(
                        [
                            [{ name: "American", age: 0.1 }, 0],
                            [{ name: "Sharp Cheddar", age: 3 }, 12],
                        ],
                        cheeseEqualityComparer
                    ),
                    Map.remove({ name: "Provolone", age: 2 }, cheeseEqualityComparer)
                )
            ).toStrictEqual(
                Map.ofArray(
                    [
                        [{ name: "American", age: 0.1 }, 0],
                        [{ name: "Sharp Cheddar", age: 3 }, 12],
                    ],
                    cheeseEqualityComparer
                )
            )
        })
    })

    describe("iter", () => {
        it("never calls the given fucntion for an empty map", () => {
            const fn = vi.fn()
            pipe(Map.empty(), Map.iter(fn))
            expect(fn).not.toHaveBeenCalled()
        })

        it("executes the given function for every key/value pair", () => {
            // arrange
            const fn = vi.fn()
            // act
            pipe(
                Map.ofRecord({
                    "red team": 44,
                    "blue team": 48,
                    "green team": 13,
                }),
                Map.iter(fn)
            )
            // assert
            expect(fn).toHaveBeenCalledTimes(3)
            ;(
                [
                    ["red team", 44],
                    ["blue team", 48],
                    ["green team", 13],
                ] as const
            ).forEach(([k, v]) => expect(fn).toHaveBeenCalledWith(k, v))
        })
    })

    describe("isEmpty", () => {
        it.each([
            [true, "empty", []],
            [
                false,
                "not empty",
                [
                    ["key1", "val1"],
                    ["key2", "val2"],
                ],
            ],
        ] as const)("returns %o if the map is %s", (expected, _, bindings) => {
            expect(pipe(Map.ofArray(bindings), Map.isEmpty)).toBe(expected)
        })
    })

    describe("size", () => {
        it.each([
            [0, []],
            [1, [["dog", 1]]],
            [
                3,
                [
                    ["dog", 1],
                    ["cat", 2],
                    ["mouse", 3],
                ],
            ],
        ] as const)("returns the size (%i) of the map", (expected, bindings) => {
            expect(pipe(Map.ofArray(bindings), Map.size)).toBe(expected)
        })
    })

    describe("keys", () => {
        it.each([
            ["empty", [], []],
            [
                "non-empty",
                [
                    ["Johnny", 1],
                    ["Amy", 2],
                    ["Leonard", 3],
                ],
                ["Amy", "Johnny", "Leonard"],
            ],
        ] as const)(
            "returns the keys in the expected order when the map is %s (default comparison)",
            (_, bindings, expected) => {
                expect(pipe(Map.ofArray(bindings), Map.keys())).toStrictEqual(expected)
            }
        )

        it.each([
            ["empty", [], []],
            [
                "non-empty",
                [
                    [{ name: "Muenster", age: 3 }, "A+"],
                    [{ name: "Cheddar", age: 2 }, "B"],
                    [{ name: "Kraft Single", age: 4 }, "F-"],
                ],
                [
                    { name: "Cheddar", age: 2 },
                    { name: "Muenster", age: 3 },
                    { name: "Kraft Single", age: 4 },
                ],
            ],
        ])(
            "returns the keys in the expected order when the map is %s (custom comparison)",
            (_, bindings, expected) => {
                expect(
                    pipe(
                        Map.ofArray<Cheese, string>(bindings as any),
                        Map.keys(cheeseByAgeComparer)
                    )
                ).toStrictEqual(expected)
            }
        )
    })

    describe("values", () => {
        it.each([
            ["empty", [], []],
            [
                "non-empty",
                [
                    ["Johnny", 1],
                    ["Amy", 2],
                    ["Leonard", 1],
                ],
                [2, 1, 1],
            ],
        ] as const)(
            "returns the values in the expected order (including duplicates) when the map is %s (default comparison)",
            (_, bindings, expected) => {
                expect(pipe(Map.ofArray(bindings), Map.values())).toStrictEqual(expected)
            }
        )

        it.each([
            ["empty", [], []],
            [
                "non-empty",
                [
                    [{ name: "Muenster", age: 3 }, "B+"],
                    [{ name: "Cheddar", age: 2 }, "F-"],
                    [{ name: "Kraft Single", age: 4 }, "B+"],
                ],
                ["F-", "B+", "B+"],
            ],
        ])(
            "returns the values in the expected order (including duplicates) when the map is %s (custom comparison)",
            (_, bindings, expected) => {
                expect(
                    pipe(
                        Map.ofArray<Cheese, string>(bindings as any),
                        Map.values(cheeseByAgeComparer)
                    )
                ).toStrictEqual(expected)
            }
        )
    })

    describe("toArray", () => {
        it("returns an empty array for an empty map", () => {
            expect(pipe(new globalThis.Map(), Map.toArray())).toStrictEqual([])
        })

        it("returns an array of tuples sorted by key (default comparison)", () => {
            expect(
                pipe(
                    Map.ofArray([
                        ["b", 2],
                        ["d", 4],
                        ["c", 3],
                        ["a", 1],
                    ]),
                    Map.toArray()
                )
            ).toStrictEqual([
                ["a", 1],
                ["b", 2],
                ["c", 3],
                ["d", 4],
            ])
        })

        it("returns an array of tuples sorted by key (custom comparison)", () => {
            expect(
                pipe(
                    Map.ofArray([
                        [{ name: "Gouda", age: 2 }, 2],
                        [{ name: "Mozzarella", age: 4 }, 4],
                        [{ name: "Garganzola", age: 3 }, 3],
                        [{ name: "Swiss", age: 1 }, 1],
                    ]),
                    Map.toArray(cheeseByAgeComparer)
                )
            ).toStrictEqual([
                [{ name: "Swiss", age: 1 }, 1],
                [{ name: "Gouda", age: 2 }, 2],
                [{ name: "Garganzola", age: 3 }, 3],
                [{ name: "Mozzarella", age: 4 }, 4],
            ])
        })
    })

    describe("filter", () => {
        it("returns an empty map if given an empty map", () => {
            expect(
                pipe(
                    Map.empty(),
                    Map.filter(() => true)
                )
            ).toStrictEqual(Map.empty())
        })

        it("filters out keys that fail the predicate", () => {
            expect(
                pipe(
                    Map.ofRecord({
                        cheese: "yum",
                        soup: "yum",
                        veggies: "bleh",
                        crackers: "yum",
                        "lima beans": "bleh",
                    }),
                    Map.filter((_, v) => v === "yum")
                )
            ).toStrictEqual(
                Map.ofArray([
                    ["cheese", "yum"],
                    ["soup", "yum"],
                    ["crackers", "yum"],
                ])
            )
        })
    })

    describe("every", () => {
        it("returns true for an empty map", () => {
            expect(
                pipe(
                    Map.empty(),
                    Map.every(() => false)
                )
            ).toBe(true)
        })

        it("returns true if every key/value pair holds true", () => {
            expect(
                pipe(
                    Map.ofRecord({
                        John: "Hancock",
                        James: "Monroe",
                        Alexander: "Hamilton",
                    }),
                    Map.every((first, last) => first.length > 0 && last.length > 0)
                )
            ).toBe(true)
        })

        it("returns false if not every key/value pair holds true", () => {
            expect(
                pipe(
                    Map.ofRecord({
                        John: "",
                        James: "Monroe",
                        Alexander: "Hamilton",
                    }),
                    Map.every((first, last) => first.length > 0 && last.length > 0)
                )
            ).toBe(false)
        })
    })

    describe("reduce", () => {
        it("reduces using default sort order", () => {
            expect(
                pipe(
                    Map.ofArray([
                        ["a", "1"],
                        ["c", "3"],
                        ["b", "2"],
                    ]),
                    Map.reduce("", (acc, k, v) => `${acc}${k}${v}`)
                )
            ).toBe("a1b2c3")
        })

        it("reduces using custom sort order", () => {
            expect(
                pipe(
                    Map.ofArray([
                        [{ name: "Parmesean", age: 1 }, "Parm"],
                        [{ name: "Gouda", age: 3 }, "Goodie"],
                        [{ name: "Gruyere", age: 2 }, "Weird Swiss"],
                    ]),
                    Map.reduce(
                        "",
                        (acc, { name }, v) => `${acc}\n${name}-${v}`,
                        cheeseByAgeComparer
                    ),
                    String.trim
                )
            ).toBe(
                pipe(
                    `
Parmesean-Parm
Gruyere-Weird Swiss
Gouda-Goodie
                    `,
                    String.trim
                )
            )
        })
    })

    describe("reduceRight", () => {
        it("reduces in reverse order, using default sort order", () => {
            expect(
                pipe(
                    Map.ofArray([
                        ["a", "1"],
                        ["c", "3"],
                        ["b", "2"],
                    ]),
                    Map.reduceRight("", (acc, k, v) => `${acc}${k}${v}`)
                )
            ).toBe("c3b2a1")
        })

        it("reduces in reverse order using custom sort order", () => {
            expect(
                pipe(
                    Map.ofArray([
                        [{ name: "Parmesean", age: 1 }, "Parm"],
                        [{ name: "Gouda", age: 3 }, "Goodie"],
                        [{ name: "Gruyere", age: 2 }, "Weird Swiss"],
                    ]),
                    Map.reduceRight(
                        "",
                        (acc, { name }, v) => `${acc}\n${name}-${v}`,
                        cheeseByAgeComparer
                    ),
                    String.trim
                )
            ).toBe(
                pipe(
                    `
Gouda-Goodie
Gruyere-Weird Swiss
Parmesean-Parm
                    `,
                    String.trim
                )
            )
        })
    })
})
