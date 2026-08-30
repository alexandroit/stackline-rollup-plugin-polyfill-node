import url from 'url';
import { URL, urlToHttpOptions } from 'node:url';

const input = new URL('https://user%20name:p%40ss@[2001:db8::1]:8443/a%20b?q=1#frag');
const extension = { retained: true };
input.extension = extension;

const before = {
  href: input.href,
  hostname: input.hostname,
  pathname: input.pathname,
  search: input.search,
  hash: input.hash
};
const options = urlToHttpOptions(input);

export const urlCompatibility = {
  protocol: options.protocol,
  hostname: options.hostname,
  port: options.port,
  pathname: options.pathname,
  search: options.search,
  path: options.path,
  hash: options.hash,
  auth: options.auth,
  href: options.href,
  copiedExtension: options.extension === extension,
  nullPrototype: Object.getPrototypeOf(options) === null,
  inputUnchanged:
    input.href === before.href &&
    input.hostname === before.hostname &&
    input.pathname === before.pathname &&
    input.search === before.search &&
    input.hash === before.hash &&
    !Object.prototype.hasOwnProperty.call(input, 'path') &&
    input.extension === extension,
  defaultContract:
    url.URL === URL &&
    url.urlToHttpOptions === urlToHttpOptions &&
    typeof url.parse === 'function'
};
