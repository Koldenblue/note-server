const express = require("express");
const path = require("path");
const fs = require("fs");
const { json } = require("express");
const util = require("util");
const errorNote = require("./error.js");

const app = express();
let PORT = process.env.PORT || 3000;


app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// serve static assets from the public directory
// this is done so that the html files can link to the js and css files
app.use(express.static('public'));


// lastId is the greatest id number a note has
let lastId = 0;

// upon server start, set lastId to be the greatest id number
fs.readFile("db/db.json", "utf8", (error, notesArr) => {
    try {
        if (error) throw error;
        if (notesArr === "") {
            notesArr = JSON.parse(notesArr);
            for (let note of notesArr) {
                note.id > lastId ? lastId = note.id : null;
            }
        }
    } catch (error) {
        console.error(error);
    }
});


// serve notes.html at this route
app.get("/notes", (request, response) => {
    response.sendFile(path.join(__dirname, "notes.html"));
});


// handle get requests to the api for notes by reading from db.json
app.get("/api/notes", (req, res) => {
    fs.readFile("db/db.json", "utf8", (error, notesObj) => {
        try {
            if (error) throw error;
            if (notesObj === "") {
                res.json([]);
            } else {
                notesObj = JSON.parse(notesObj);
                res.json(notesObj);
            }
        } catch (error) {
            console.error(error);
            res.json(errorNote);
        }
    });
});


// this route must be last, as the default action. Return to index.html for any routes except the ones specified above.
app.get("/*", function(req, res) {
    res.sendFile(path.join(__dirname, "index.html"));
});


// allow posting of new notes to the notes api
app.post("/api/notes", (req, res) => {
    try {
        // first read from db.json to get the current notes
        fs.readFile("db/db.json", "utf8", (error, notesArr) => {
            if (error) throw error;
            // next parse the notes as an array
            notesArr === "" ? notesArr = [] : notesArr = JSON.parse(notesArr);

            // increment lastId, then assign id to the new note. Push the new note to the note array.
            req.body.id = ++lastId;
            notesArr.push(req.body);

            // send json response to front end in order to update the notes. Push the new note to the array.
            // must return true for function to complete promise
            res.json(true);

            // convert the notes array back into a string, and write back to db.json
            notesArr = JSON.stringify(notesArr, null, 2);
            fs.writeFile("db/db.json", notesArr, (err) => {
                if (err) throw err;
            });
        });
    } catch (error) {
        console.error(error);
    }
});


app.delete("/api/notes/:id", (req, res) => {
    console.log(req.params);
    noteToDelete = Number(req.params.id);
    console.log("note to delete is " + noteToDelete)
    deleteNote(noteToDelete).then(function() {
        console.log("Sending response")
        // must return true as response! Or promised deleteNote() will never finish and notes won't be newly rendered
        res.json(true)
    })
});

async function deleteNote(noteToDelete) {
    let writeFileAsync = util.promisify(fs.writeFile);
    let readFileAsync = util.promisify(fs.readFile);
    let currentNotes;
    try {
        currentNotes = await readFileAsync("db/db.json", "utf8");
        // next parse the notes as an array. notes will never be blank for delete.
        currentNotes = JSON.parse(currentNotes);

        // Find the note to delete in the array, and delete it
        // tried to use .forEach(), but apparently .forEach() cannot accept break statement
        for (let i = 0, j = currentNotes.length; i < j; i++) {
            console.log(currentNotes[i].id)
            if (currentNotes[i].id === noteToDelete) {
                currentNotes.splice(i, 1);
                break;
            }
        }
        currentNotes = JSON.stringify(currentNotes, null, 2);
        
    }
    catch (err) {
        throw err;
    };
    // write back to db.json. This is asynchronous!
    // front end then reads db.json with a get request
    try {
        await writeFileAsync("db/db.json", currentNotes)
        console.log("responding")
    } catch (error) {
        console.error(error);
    }
    console.log("finished writing db note file")
}

// last lines of code
app.listen(PORT, function() {
    console.log("App listening on PORT " + PORT);
});
