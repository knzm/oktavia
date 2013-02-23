import "console.jsx";
import "js/nodejs.jsx";

import "oktavia.jsx";
import "getopt.jsx";
import "htmlparser.jsx";
import "csvparser.jsx";
import "textparser.jsx";

import "stemmer/stemmer.jsx";
import "stemmer/danish-stemmer.jsx";
import "stemmer/dutch-stemmer.jsx";
import "stemmer/english-stemmer.jsx";
import "stemmer/finnish-stemmer.jsx";
import "stemmer/french-stemmer.jsx";
import "stemmer/german-stemmer.jsx";
import "stemmer/hungarian-stemmer.jsx";
import "stemmer/italian-stemmer.jsx";
import "stemmer/norwegian-stemmer.jsx";
import "stemmer/porter-stemmer.jsx";
import "stemmer/portuguese-stemmer.jsx";
import "stemmer/romanian-stemmer.jsx";
import "stemmer/russian-stemmer.jsx";
import "stemmer/spanish-stemmer.jsx";
import "stemmer/swedish-stemmer.jsx";
import "stemmer/turkish-stemmer.jsx";


class _Main
{
    static function usage () : void
    {
        console.log([
            "usage: oktavia_indexer [options]",
            "",
            " -i, --input [input folder/file ] : Target files to search. .html, .csv, .txt are available.",
            " -t, --type [type]                : Export type. 'cmd', 'web', 'index' are available.",
            " -m, --mode [mode]                : Mode type. 'html', 'csv', 'text' are available.",
            " -h, --help                       : Display this message.",
            "",
            "HTML Mode Options:",
            " -r, --root  [document root]      : Document root folder. Default is current. ",
            "                                  : Indexer creates result file path from this folder.",
            " -p, --prefix [directory prefix]  : Directory prefix for a document root from a server root.",
            "                                  : If your domain is example.com and 'manual' is passed,",
            "                                  : document root become http://example.com/manual/.",
            "                                  : It effects search result URL. Default value is '/'.",
            " -o, --output [outputfolder]      : Directory that will store output files.",
            "                                  : This is a relative path from root.",
            "                                  : Default value is '/search'. ",
            " -u, --unit [search unit]         : 'file', 'h1'-'h6'. Default value is 'file'.",
            " -f, --filter [target tag]        : Only contents inside this tag is indexed.",
            "                                  : Default value is \"article,#content,#main\".",
            " -s, --stemmer [algorithm]        : Select stemming algorithm.",
            " -w, --word-splitter [splitter]   : Use optional word splitter.",
            "                                  : 'ts' (TinySegmenter for Japanese) is available",
            "",
            "Text Mode Options:",
            " -s, --stemmer [algorithm]        : Select stemming algorithm.",
            " -w, --word-splitter [splitter]   : Use optional word splitter.",
            "                                  : 'ts' (TinySegmenter for Japanese) is available",
            " -u, --unit [search unit]         : file, block, line. Default value is 'file'.",
            "",
            "Supported Stemmer Algorithms:",
            "  danish, dutch, english, finnish, french german, hungarian italian",
            "  norwegian, porter, portuguese, romanian, russian, spanish, swedish, turkish"
        ].join('\n'));
    }

    static function main(args : string[]) : void
    {
        console.log("Search Engine Oktavia Index Generator");
        var optstring = "m:(mode)i:(input)r:(root)p:(prefix)o:(output)h(help)u:(unit)f:(filter)s:(stemmer)w:(word-splitter)t:(type)";
        var parser = new BasicParser(optstring, args);

        var inputs = [] : string[];
        var root = process.cwd();
        var prefix = '/';
        var output = "search";
        var showhelp = false;
        var notrun = false;
        var unit = 'file';
        var type = 'index';
        var mode = '';
        var tagfilter = [] : string[];
        var idfilter = [] : string[];
        var algorithm : Nullable.<string> = null;
        var wordsplitter : Nullable.<string> = null;
    
        var validModes = ['html', 'csv', 'text'];
        var validUnitsForHTML = ['file', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        var validUnitsForText = ['file', 'block', 'line'];
        var validStemmers = [
            'danish', 'dutch', 'english', 'finnish', 'french', 'german', 'hungarian',
            'italian', 'norwegian', 'porter', 'portuguese', 'romanian', 'russian',
            'spanish', 'swedish', 'turkish'
        ];
        var validTypes = ['cmd', 'web', 'index'];
        var validWordSplitters = ['ts'];

        var opt = parser.getopt();
        while (opt)
        {
            switch (opt.option)
            {
            case "m":
                if (validModes.indexOf(opt.optarg) == -1)
                {
                    console.error("Option m/mode should be 'html', 'csv', 'text'.");
                    notrun = true;
                }
                mode = opt.optarg;
                break;
            case "i":
                inputs.push(opt.optarg);
                break;
            case "r":
                root = node.path.resolve(opt.optarg);
                break;
            case "p":
                prefix = opt.optarg;
                break;
            case "o":
                output = opt.optarg;
                if (output.slice(0, 1) == '/')
                {
                    output = output.slice(1);
                }
                break;
            case "h":
                showhelp = true;
                break;
            case "u":
                unit = opt.optarg;
                break;
            case "f":
                var items = opt.optarg.split(',');
                for (var i in items)
                {
                    var item = items[i];
                    if (item.slice(0, 1) == '#')
                    {
                        idfilter.push(item);
                    }
                    else
                    {
                        tagfilter.push(item);
                    }
                }
                break;
            case "t":
                if (validTypes.indexOf(opt.optarg) == -1)
                {
                    console.error('Option t/type is invalid.');
                    notrun = true;
                }
                else
                {
                    type = opt.optarg;
                }
                break;
            case "s":
                if (validStemmers.indexOf(opt.optarg) == -1)
                {
                    console.error('Option s/stemmer is invalid.');
                    notrun = true;
                }
                else
                {
                    algorithm = opt.optarg;
                }
                break;
            case "w":
            
                break;
            case "?":
                notrun = true;
                break;
            }
            opt = parser.getopt();
        }
        var inputTextFiles = [] : string[];
        var inputHTMLFiles = [] : string[];
        var inputCSVFiles = [] : string[];
        if (tagfilter.length == 0 && idfilter.length == 0)
        {
            tagfilter = ['article'];
            idfilter = ['#content', '#main'];
        }
        for (var i in inputs)
        {
            var input = inputs[i];
            if (!node.fs.existsSync(input))
            {
                console.error("Following input folder/file doesn't exist: " + input);
                notrun = true;
            }
            else
            {
                var stat = node.fs.statSync(input);
                if (stat.isFile())
                {
                    _Main._checkFileType(node.path.resolve(input), inputTextFiles, inputHTMLFiles, inputCSVFiles);
                }
                else if (stat.isDirectory())
                {
                    _Main._checkDirectory(input, inputTextFiles, inputHTMLFiles, inputCSVFiles);
                }
                else
                {
                    console.error("Following input is not folder or file: " + input);
                    notrun = true;
                }
            }
        }
        if (inputTextFiles.length == 0 && inputHTMLFiles.length == 0 && inputCSVFiles.length == 0 || !mode)
        {
            showhelp = true;
        }
        if (showhelp)
        {
            _Main.usage();
        }
        else if (!notrun)
        {
            var indexFilePath = node.path.resolve(root, output, 'index.okt');
            var dirPath = node.path.dirname(indexFilePath);
            _Main._mkdirP(dirPath);
            var stemmer : Nullable.<Stemmer> = null;
            if (algorithm)
            {
                stemmer = _Main._createStemmer(algorithm);
            }
            switch (mode)
            {
            case 'html':
                var unitIndex = validUnitsForHTML.indexOf(unit);
                if (unitIndex == -1)
                {
                    console.error('Option u/unit should be file, h1, h2, h3, h4, h5, h6. But ' + unit);
                }
                else
                {
                    var htmlParser = new HTMLParser(unitIndex, root, prefix, tagfilter, idfilter, stemmer);
                    for (var i = 0; i < inputHTMLFiles.length; i++)
                    {
                        htmlParser.parse(inputHTMLFiles[i]);
                    }
                    htmlParser.dump(indexFilePath);
                }
                break;
            case 'csv':
                var csvParser = new CSVParser(root, stemmer);
                for (var i in inputCSVFiles)
                {
                    csvParser.parse(inputCSVFiles[i]);
                }
                break;
            case 'text':
                if (validUnitsForText.indexOf(unit) == -1)
                {
                    console.error('Option u/unit should be file, block, line. But ' + unit);
                }
                else
                {
                    var textParser = new TextParser(unit, root, stemmer);
                    for (var i in inputTextFiles)
                    {
                        textParser.parse(inputTextFiles[i]);
                    }
                }
                break;
            }
            //var dump = oktavia.dump();
            //node.fs.writeFileSync(indexFilePath, dump, "utf16");
        }
    }

    static function _checkFileType (path : string, texts : string[], HTMLs : string[], CSVs : string[]) : void
    {
        var match = path.match(/(.*)\.(.*)/);
        if (match && match[1])
        {
            switch (match[2].toLowerCase())
            {
            case 'html':
            case 'htm':
                HTMLs.push(path);
                break;
            case 'csv':
                CSVs.push(path);
                break;
            default:
                texts.push(path);
            }
        }
    }

    static function _checkDirectory (path : string, texts : string[], HTMLs : string[], CSVs : string[]) : void
    {
        var files = node.fs.readdirSync(path);
        for (var j in files)
        {
            var filepath = node.path.resolve(path, files[j]);
            var stat = node.fs.statSync(filepath);
            if (stat.isFile())
            {
                _Main._checkFileType(filepath, texts, HTMLs, CSVs);
            }
            else if (stat.isDirectory())
            {
                _Main._checkDirectory(filepath, texts, HTMLs, CSVs);
            }
        }
    }

    static function _mkdirP (path : string) : void
    {
        if (node.fs.existsSync(path))
        {
            return;
        }
        _Main._mkdirP(node.path.dirname(path));
        node.fs.mkdirSync(path);
    }

    static function _createStemmer (algorithm : string) : Stemmer
    {
        var stemmer : Stemmer;
        switch (algorithm.toLowerCase())
        {
        case "danish":
            stemmer = new DanishStemmer();
            break;
        case "dutch":
            stemmer = new DutchStemmer();
            break;
        case "english":
            stemmer = new EnglishStemmer();
            break;
        case "finnish":
            stemmer = new FinnishStemmer();
            break;
        case "french":
            stemmer = new FrenchStemmer();
            break;
        case "german":
            stemmer = new GermanStemmer();
            break;
        case "hungarian":
            stemmer = new HungarianStemmer();
            break;
        case "italian":
            stemmer = new ItalianStemmer();
            break;
        case "norwegian":
            stemmer = new NorwegianStemmer();
            break;
        case "porter":
            stemmer = new PorterStemmer();
            break;
        case "portuguese":
            stemmer = new PortugueseStemmer();
            break;
        case "romanian":
            stemmer = new RomanianStemmer();
            break;
        case "russian":
            stemmer = new RussianStemmer();
            break;
        case "spanish":
            stemmer = new SpanishStemmer();
            break;
        case "swedish":
            stemmer = new SwedishStemmer();
            break;
        case "turkish":
            stemmer = new TurkishStemmer();
            break;
        default:
            stemmer = new EnglishStemmer();
            break;
        }
        return stemmer;
    }
}