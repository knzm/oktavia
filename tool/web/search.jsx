import "oktavia.jsx";
import "binary-util.jsx";
import "query.jsx";
import "query-string-parser.jsx";
import "search-result.jsx";
import "style.jsx";
import "stemmer/stemmer.jsx";


class _Result
{
    var title : string;
    var url : string;
    var content : string;
    var score : int;
    function constructor (title : string, url : string, content : string, score : int)
    {
        this.title = title;
        this.url = url;
        this.content = content;
        this.score = score;
    }
}

class _Proposal
{
    var options : string;
    var label : string;
    var count : int;
    function constructor (options : string, label : string, count : int)
    {
        this.options = options;
        this.label = label;
        this.count = count;
    }
}

class Search
{
    var _oktavia : Nullable.<Oktavia>;
    var _stemmer : Nullable.<Stemmer>;
    var _queryString : Nullable.<string>;
    var _queries : Query[];
    var _callback : Nullable.<function(:int, :int):void>;
    var _entriesPerPage : int;
    var _currentPage : int;
    var _result : SearchUnit[];
    var _proposals : Proposal[];
    var _currentFolderDepth : int;

    function constructor (entriesPerPage : int)
    {
        this._oktavia = null;
        this._stemmer = null;
        this._entriesPerPage = entriesPerPage;
        this._currentPage = 1;
        this._queryString = null;
        this._callback = null;
    }

    function constructor (entriesPerPage : int, stemmer : Stemmer)
    {
        this._oktavia = null;
        this._stemmer = stemmer;
        this._entriesPerPage = entriesPerPage;
        this._currentPage = 1;
        this._queryString = null;
        this._callback = null;
    }

    function loadIndex (index : string) : void
    {
        this._oktavia = new Oktavia();
        if (this._stemmer)
        {
            this._oktavia.setStemmer(this._stemmer);
        }
        this._oktavia.load(Binary.base64decode(index));
        if (this._queryString)
        {
            this.search(this._queryString, this._callback);
            this._queryString = null;
            this._callback = null;
        }
    }

    function search (queryString : string, callback : function(:int, :int):void) : void
    {
        if (this._oktavia)
        {
            var queryParser = new QueryStringParser();
            queryParser.parse(queryString);
            this._queries = queryParser.queries;
            var summary = this._oktavia.search(queryParser.queries);
            if (summary.size() > 0)
            {
                this._result = this._sortResult(summary);
                this._proposals = [] : Proposal[];
                this._currentPage = 1;
            }
            else
            {
                this._result = [] : SearchUnit[];
                this._proposals = summary.getProposal();
                this._currentPage = 1;
            }
            callback(this.resultSize(), this.totalPages());
        }
        else
        {
            this._queryString = queryString;
            this._callback = callback;
        }
    }

    function resultSize () : int
    {
        return this._result.length;
    }

    function totalPages () : int
    {
        return Math.ceil(this._result.length / this._entriesPerPage);
    }

    function currentPage () : int
    {
        return this._currentPage;
    }

    function setCurrentPage (page : int) : void
    {
        this._currentPage = page;
    }

    function hasPrevPage () : boolean
    {
        return (this._currentPage != 1);
    }

    function hasNextPage () : boolean
    {
        return (this._currentPage != this.totalPages());
    }

    function getResult () : _Result[]
    {
        var style = new Style('html');
        var start = (this._currentPage - 1) * this._entriesPerPage;
        var last = this._currentPage * this._entriesPerPage;
        var metadata = this._oktavia.getPrimaryMetadata();
        var num = 250;

        var results = [] : _Result[];

        for (var i = start; i < last; i++)
        {
            var unit = this._result[i];
            var info = metadata.getInformation(unit.id).split(Oktavia.eob);

            var offset = info[0].length + 1;
            var content = metadata.getContent(unit.id);
            var start = 0;
            var positions = unit.getPositions();
            if (content.indexOf(info[0]) == 1)
            {
                content = content.slice(info[0].length + 2, content.length);
                start += (info[0].length + 2);
            }
            var end = start + num;
            var split = false;
            if (positions[0].position > end - positions[0].word.length)
            {
                end = positions[0].position + Math.floor(num / 2);
                split = true;
            }
            for (var j = positions.length - 1; j > -1; j--)
            {
                var pos = positions[j];
                if (pos.position + pos.word.length < end)
                {
                    content = [
                        content.slice(0, pos.position - start),
                        style.convert('<hit>*</hit>').replace('*', content.slice(pos.position - start, pos.position + pos.word.length - start)),
                        content.slice(pos.position + pos.word.length - start, content.length)
                    ].join('');
                }
            }
            var text : string;
            if (split)
            {
                text = [
                    content.slice(0, Math.floor(num / 2)) + ' ...',
                    content.slice(-Math.floor(num / 2), end - start)].join('<br/>');
            }
            else
            {
                text = content.slice(0, end - start) + ' ...<br/>';
            }
            text = text.replace(Oktavia.eob, ' ').replace(/(<br\/>)(<br\/>)+/, '<br/><br/>');
            results.push(new _Result(info[0], info[1], text, unit.score));
             
        }
        return results;
    }

    function getProposals () : _Proposal[]
    {
        var style = new Style('html');
        var results = [] : _Proposal[];

        if (this._queries.length > 1)
        {
            for (var i = 0; i < this._proposals.length; i++)
            {
                var proposal = this._proposals[i];
                var label = [] : string[];
                var option = [] : string[];
                for (var j = 0; j < this._queries.length; j++)
                {
                    if (j != proposal.omit)
                    {
                        label.push(style.convert('<hit>' + this._queries[j].toString() + '</hit>'));
                        option.push(this._queries[j].toString());
                    }
                    else
                    {
                        label.push(style.convert('<del>' + this._queries[j].toString() + '</del>'));
                    }
                }
                results.push(new _Proposal(option.join(' '), label.join('&nbsp;'), proposal.expect)); 
            }
        }
        return results;
    }

    function _sortResult (summary : SearchSummary) : SearchUnit[]
    {
        for (var i = 0; i < summary.result.units.length; i++)
        {
            var score = 0;
            var unit = summary.result.units[i];
            for (var pos in unit.positions)
            {
                var position = unit.positions[pos];
                if (this._oktavia.wordPositionType(position.position))
                {
                    score += 10;
                }
                else
                {
                    score += 1;
                }
                if (!position.stemmed)
                {
                    score += 2;
                }
            }
            unit.score = score;
        }
        return summary.getSortedResult();
    }
}