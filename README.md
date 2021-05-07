# Chat Game

An adventure like game with a chat interface.

## Setup

1. Write the game script in Markdown (or convert to Markdown);
1. Set up a Firebase Realtime database using `firebase-rules.json`;
1. Set up a service account and store authentication data in `api-libs/auth.json`;
1. Set up a authentication and bonus API;
1. Update `config.js`;
1. Include `<script src="https://example.now.sh/app.js"></script>` in your website.

🚧 **Important**: remember to update dependencies to avoid vulnerabilities and fix code that may break

The following files and functions might need to be localized.

* The entire `api-libs/parser.js` module;
* `normalizeInput` function at `src/utils/index.js`;
* `normalizeInput` function at `api-libs/data-converter.js`.

## Example game script

```markdown

Each h1 heading and the following paragraphs are the events. The first paragraph is
the text that will be displayed when the player first visits the event. The second
paragraph, if it exists, is the text show in the other times the player gets to the
event.

Text before any event gets ignored. You can use it to write annotations like this one.

# Scene 1

Each h1 heading and the following paragraphs are the events. The first paragraph is
the text that will be displayed when the player first visits the event.

The second paragraph, if it exists, is the text show in the other times the player gets
to the event.

* [A list] of actions is next.
* [Commands] are represented by brackets.
* [When] a command is typed the following action is executed.
* [The] default action is showing this message.
* [You] can also use actions in keys like {goto "scene 2"}.

The paragraphs after the list of actions are ignored.

# Scene 2

You can use {add flag "name"}, {if have flag "name"}, {else}, {goto "event name"} and
other actions. Check the parser source code for more info.  
You can also use hard breaks.

When a events don't have an action list it means that the game ended.

# Scene 3

* When a scene don't have any command the actions in the list are executed automatically.

```
