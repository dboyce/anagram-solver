(function(exports) {
    var Dictionary = function() {
        this.rootNode = new Node();
        this.allowPartials = false;
        this.wordCount = 0;
    };
    Dictionary.prototype = {
        addWord: function(word) {
            var current = this.rootNode;
            for(var i = 0; i < word.length; i++) {
                current = current.addChild(word[i]);
            }
            current.word = true;
            this.wordCount++;
        },
        findMatches: function(letters) {
            var results = {current:[], matches:[], allowPartials: this.allowPartials};
            this.rootNode.find(letters.split(''), results);
            var ret = _.sortBy(_.uniq(results.matches), 'length').reverse();
            if(ret.length > 10) {
                ret = ret.slice(0,9);
            }
            return ret;
        }
    };

    var Node = function(letter) {
        this.letter = letter;
        this.children = {};
        this.hasChildren = false;
        this.word = false;
    };
    Node.prototype = {
        toString: function() { return this.letter; },
        addChild: function(letter) {
            this.hasChildren = true;
            var ret = this.children[letter];
            if(ret === undefined) {
                this.children[letter] = (ret = new Node(letter));
            }
            return ret;
        },
        find: function(letters, results) {
            var matched = false;
            for(var i = 0; i < letters.length; i++) {
                var letter = letters[i];
                if(this.children[letter] !== undefined) {
                    matched = true;
                    results.current.push(letter);
                    var newLetters = letters.slice(0);
                    newLetters.splice(_.indexOf(newLetters, letter), 1);
                    this.children[letter].find(newLetters, results);
                    results.current.pop();
                }
            }
            if(!matched && (results.allowPartials || this.word)) {
                results.matches.push(results.current.join(''));
            }
        }
    };

    var DictionaryParser = function() {
        this.regex = /^(.+?)\s+[A-Z]\??\:\s*(.*)$/gm;
        this.inflectionRegex = /[a-zA-Z]+/g;
    };

    DictionaryParser.prototype = {
        parse: function(data ,handler) {
            var line, inflection;
            this.regex.lastIndex = 0;
            while((line = this.regex.exec(data)) !== null) {
                handler(line[1]);
                this.inflectionRegex.lastIndex = 0;
                while((inflection = this.inflectionRegex.exec(line[2]))) {
                    handler(inflection[0]);
                }
            }
        }
    };

    var DictionaryLoader = function(dictionary,listener) {
        this.dictionary = dictionary;
        this.listener = listener;
        this.total = 169210;
        this.listener['complete'] = this.listener['complete'] || function(){console.log('loading complete');}
        this.listener['progress'] = this.listener['progress'] || function(progress){console.log(progress + "% complete");}
        this.listener['error'] = this.listener['error'] || function(err){console.log("loading failed with error: " + err);}
    };
    DictionaryLoader.prototype = {
        populate: function(url) {
            $.ajax({
                type: 'GET',
                dataType: 'text',
                url: url,
                success: _.bind(this._doPopulate, this),
                error: this.listener.error
            });
        },
        _doPopulate: function(data) {
            var counter = 0, _this = this, marker = 10;
            this.parser().parse(data, function(word){
                _this.dictionary.addWord(word.toLowerCase());
                if(++counter > 1000000) {
                    throw 'too many words in dictionary!!'
                }
                progress = (counter / _this.total * 100)
                if(progress > marker) {
                    _this.listener['progress'](Math.round(progress));
                    marker += 10;
                }
            });
            this.listener['complete']();
        },
        parser: function() {
            return new DictionaryParser();
        }
    };


    var WildcardSearch = function(term) {
        var _this = this;
        this.cmds = [];
        _.each(term.toLowerCase().split(''), function(letter, i){
            var last = i == term.length - 1;
            if(letter === '*') {
                _this.cmds.push(function(node, results){
                    _.each(_.keys(node.children), function(key){
                        var current = node.children[key];
                        results.stack.unshift(results.stack[0].slice(0));
                        results.stack[0].push(key);
                        if(last) {
                            if(current.word) {
                                results.matches.push(results.stack[0].join(''));
                            }
                        }
                        else {
                            _this.cmds[i + 1](current, results);
                        }
                        results.stack.shift();
                    });
                });
            }
            else {
                _this.cmds.push(function(node, results){
                    if(node.children[letter] !== undefined) {
                        results.stack[0].push(letter);
                        if(last) {
                            if(node.children[letter].word) {
                                results.matches.push(results.stack[0].join(''));
                            }
                        }
                        else {
                            _this.cmds[i+1](node.children[letter], results);
                        }
                    }
                });
            }
        });

    };

    WildcardSearch.prototype = {
        invoke: function(dictionary){
            var results = {stack:[[]], matches: []};
            this.cmds[0](dictionary.rootNode, results);
            return results.matches;
        }
    };

    exports.App = {
        Node: Node,
        Dictionary: Dictionary,
        DictionaryLoader: DictionaryLoader,
        DictionaryParser: DictionaryParser,
        WildcardSearch: WildcardSearch
    }
})(window);

