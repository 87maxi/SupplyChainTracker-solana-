/**
 * Compatibility shim for @solana/kit addSelfFetchFunctions
 *
 * The generated Codama code uses addSelfFetchFunctions from @solana/kit,
 * but this function is not exported in the installed version.
 * This shim patches the module to provide the missing functionality.
 */

import * as kit from "@solana/kit";
import {
  fetchEncodedAccount,
  decodeAccount,
  assertAccountExists,
  type Account,
  type Address,
  type FetchAccountConfig,
  type FixedSizeCodec,
  type MaybeAccount,
} from "@solana/kit";

// Polyfill for addSelfFetchFunctions
function addSelfFetchFunctionsPolyfill<TAccount extends object>(
  client: { rpc: any },
  codec: FixedSizeCodec<TAccount>,
): FixedSizeCodec<TAccount> & {
  fetch: (address: Address, config?: FetchAccountConfig) => Promise<Account<TAccount>>;
  fetchMaybe: (address: Address, config?: FetchAccountConfig) => Promise<MaybeAccount<TAccount>>;
  fetchNullable: (address: Address, config?: FetchAccountConfig) => Promise<MaybeAccount<TAccount>>;
} {
  const fetch = async (
    address: Address,
    config?: FetchAccountConfig,
  ): Promise<Account<TAccount>> => {
    const maybeAccount = await fetchMaybe(address, config);
    assertAccountExists(maybeAccount);
    return maybeAccount as Account<TAccount>;
  };

  const fetchMaybe = async (
    address: Address,
    config?: FetchAccountConfig,
  ): Promise<MaybeAccount<TAccount>> => {
    const encoded = await fetchEncodedAccount(client.rpc, address, config);
    return decodeAccount(encoded, codec.decoder as any) as MaybeAccount<TAccount>;
  };

  // @ts-ignore - Adding methods to codec
  return Object.assign(codec, {
    fetch,
    fetchMaybe,
    fetchNullable: fetchMaybe, // Alias for backward compatibility
  });
}

// Patch the kit module to include the missing function
if (!(kit as any).addSelfFetchFunctions) {
  (kit as any).addSelfFetchFunctions = addSelfFetchFunctionsPolyfill;
}

export { addSelfFetchFunctionsPolyfill as addSelfFetchFunctions };
