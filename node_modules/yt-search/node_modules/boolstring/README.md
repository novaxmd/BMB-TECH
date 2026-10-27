# boolString
Converts a string like true, on, or enabled into a boolean.

## Install
Using Node.js (via npm)
```bash
npm install --save boolstring
```

Using Web Browser (via unpkg)
```HTML
<script src="https://unpkg.com/boolstring@2.0.1/index.js"></script>
```

## Example
```JavaScript
var yesString = "yes";

console.log(boolString(yesString)); // true

var noString = "no";

console.log(boolString(noString)); // false
```

## Supported Strings
Contributions are welcome to add more strings. To start, create a pull request (preferred) or an issue.

* `true`
* `yes`
* `enable`
* `enabled`
* `valid`
* `validated`
* `active`
* `activated`
* `permit`
* `permitted`
* `allow`
* `allowed`
* `pass`
* `passed`
* `on`
* `1`

## License
boolString is licensed under the open source MIT license. View the [LICENSE](https://github.com/domkalan/boolString/blob/master/LICENSE) file for more information.