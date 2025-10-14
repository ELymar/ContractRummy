const readline = require('readline');

class SimpleMenu {
  constructor(prompt = 'Please select an option:') {
    this.prompt = prompt;
    this.options = [];
  }

  addOption(name, action) {
    this.options.push({name, action});
  }

  display() {
    console.log('\n' + this.prompt);
    for (let i = 0; i < this.options.length; i++) {
      console.log(`${i + 1}. ${this.options[i].name}`);
    }
  }

  async getChoice() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      const askForInput = () => {
        rl.question('Enter option number: ', (answer) => {
          const choice = parseInt(answer);
          if (choice >= 1 && choice <= this.options.length) {
            rl.close();
            resolve(choice - 1);
          } else {
            console.log('Invalid option. Please try again.');
            askForInput();
          }
        });
      };
      askForInput();
    });
  }

  async showAndExecute() {
    this.display();
    const choiceIndex = await this.getChoice();
    return this.options[choiceIndex].action();
  }
}

module.exports = SimpleMenu;
