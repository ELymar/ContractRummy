const readLine = require('readline');
class Menu
{
    constructor(options){
        this.options = options;
        this.selected = 0;
        this.selectedOption = this.options[this.selected];
    }

    showOptions = () => {
        console.log("Please select an option:"); 
        this.options.forEach((option, idx) => {
            console.log(`${idx + 1}. ${option}`);
        });
        // get user input
        const rl = readLine.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('Enter your choice: ', (answer) => {
            rl.close();
            this.selected = answer - 1;
            this.selectedOption = this.options[this.selected];
            this.options.callback(); 
        });
    }
    // Where should options live? GameAction strings and callbacks?
    

}