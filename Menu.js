const readlinesync = require('readline-sync');
class Option {
    constructor(name, action) {
        this.name = name;
        this.action = action;
    }
}

class Menu {
    constructor() {
        this.options = [];
        this.selected = 0;
        this.selectedOption = this.options[this.selected];
    }

    optionString = () => {
        let str = `Please select an option:\n`;
        for (let i = 0; i < this.options.length; i++) {
            str += `${i + 1}. ${this.options[i].name}\n`;
        }
        return str;
    }

    addOption = (prompt, callback) => {
        this.options.push(new Option(prompt, callback));
    }

    showOptionsAndProcessResponse = () => {
        console.log(this.optionString());
        // prompt user
        let input = readlinesync.question('Enter option number: ');
        // validate input
        while (input < 1 || input > this.options.length) {
            console.log('Invalid option');
            this.showOptionsAndProcessResponse();
        }
        // execute callback
        this.options[input - 1].action();

    }
    // Where should options live? GameAction strings and callbacks?


}

module.exports = { Menu, Option };