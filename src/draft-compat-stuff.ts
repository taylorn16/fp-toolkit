import { Either, match as matchEither } from "fp-ts/Either"
import { Decoder, draw as drawError } from "io-ts/Decoder"
import { flow, pipe } from "./composition"
import { Result } from "./Result"

interface ResultDecoder<Input, Output> {
    decode: (i: Input) => Result<Output, string>
}

export const eitherToResult = <A, E>(either: Either<E, A>): Result<A, E> =>
    pipe(either, matchEither<E, A, Result<A, E>>(Result.err, Result.ok))

export const toResultDecoder = <Input, Output>({
    decode,
}: Decoder<Input, Output>): ResultDecoder<Input, Output> => ({
    decode: flow(decode, eitherToResult, Result.mapErr(drawError)),
})
