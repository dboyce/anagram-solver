module("dictionary parser", {
    setup: function() {
        this.parser = new App.DictionaryParser();
        this.words = [];
    }
});

test("test parse word plus inflections", function() {
    var _this = this;
    this.parser.parse("Acanthophis N: Acanthophises?, Acanthophisses<? 1, Acanthophes~? 1",
        function(word){_this.words.push(word)
     });
    equal(this.words.length, 4);
    ok(_.contains(this.words, "Acanthophis"));
    ok(_.contains(this.words, "Acanthophises"));
    ok(_.contains(this.words, "Acanthophisses"));
    ok(_.contains(this.words, "Acanthophes"));
});

module("dictionary model", {
    setup: function() {
        this.node = new App.Node();
        this.results = {current:[], matches:[], allowPartials: this.allowPartials};
        this.MockNode = function() {
            this.invocations = [];
        };
        this.MockNode.prototype = {
            find: function(letters, results) {
                this.invocations.push({letters:letters.slice(0), results: {
                        current: results.current.slice(0),
                        matches: results.matches.slice(0)
                    }
                });
            },
            invoked: function() { return this.invocations.length; }
        };
        this.letter = function(letter) {
            this.node.children[letter] = new this.MockNode();
        };
        this.searched = function(letter,count) {
            return this.node.children[letter].invoked() === ( count || 1)
        }
        this.getLetter = function(letter) {
            return this.node.children[letter];
        }
    }
});

test("test search child nodes", function() {

    this.letter('a');
    this.letter('b');
    this.letter('c');

    this.node.find('ab'.split(''), this.results);

    ok(this.searched('a'));
    ok(this.searched('b'));
    ok(!this.searched('c'));
});

test("test pass unmatched letters", function() {

    this.letter('a');
    this.letter('b');
    this.letter('c');

    this.node.find('ab'.split(''), this.results);

    var ai = this.getLetter('a').invocations[0];
    ok(ai.letters.length, 1);
    ok(_.contains(ai.letters, 'b'));

});

test("test pass matched sequence", function() {

    this.letter('a');
    this.letter('b');
    this.letter('c');

    this.node.find('ab'.split(''), this.results);

    var ai = this.getLetter('a').invocations[0];
    ok(ai.results.current.length, 1);
    ok(_.contains(ai.results.current, 'a'));

    equal(0, this.results.current.length);

});