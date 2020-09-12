/* eslint-disable no-unused-vars */
import React, { Component } from "react";
import { ExpenseList, ExpenseForm, LoadingBar } from "./components/index";
import { MDCSnackbar } from "@material/snackbar/dist/mdc.snackbar.js";
import {SiGooglesheets} from "react-icons/si";

import "@material/fab/dist/mdc.fab.css";
import "@material/button/dist/mdc.button.css";
import "@material/toolbar/dist/mdc.toolbar.css";
import "@material/snackbar/dist/mdc.snackbar.css";
import "@material/card/dist/mdc.card.css";
import "@material/fab/dist/mdc.fab-1.css";

import "./App.css";



class App extends Component {
  constructor() {
    super();
    
    this.clientId =
      "622709193879-03d8ns246attv64khmpo0sp60jke1qaf.apps.googleusercontent.com"; /*622709193879-03d8ns246attv64khmpo0sp60jke1qaf.apps.googleusercontent.com*/
    this.spreadsheetId =
      process.env.REACT_APP_SHEET_ID ||
      "1aFkjpZ6Dpsgxsp0KECTHlHQ1OXUjGn6LhmoZSUjJEIE"; /*1aFkjpZ6Dpsgxsp0KECTHlHQ1OXUjGn6LhmoZSUjJEIE*/

    this.openWin = this.openWin.bind(this); /*added*/

    this.state = {
      signedIn: undefined,
      accounts: [],
      categories: [],
      expenses: [],
      processing: true,
      expense: {},
      currentMonth: undefined,
      previousMonth: undefined,
      showExpenseForm: false,
      valueData: undefined, //added
      initialsavingsData: undefined, //added
      initialchequingData: undefined, //added
      valueChequing: undefined //added
    };


  }
  openWin(){
    window.open("https://docs.google.com/spreadsheets/d/1aFkjpZ6Dpsgxsp0KECTHlHQ1OXUjGn6LhmoZSUjJEIE/edit#gid=0");

  } /*added*/


  componentDidMount() {
    window.gapi.load("client:auth2", () => {
      window.gapi.client
        .init({
          discoveryDocs: [
            "https://sheets.googleapis.com/$discovery/rest?version=v4"
          ],
          clientId: this.clientId,
          scope:
            "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly"
        })
        .then(() => {
          window.gapi.auth2
            .getAuthInstance()
            .isSignedIn.listen(this.signedInChanged);
          this.signedInChanged(
            window.gapi.auth2.getAuthInstance().isSignedIn.get()
          );
        });
    });
    document.addEventListener("keyup", this.onKeyPressed.bind(this));
  }

  onKeyPressed = (e) => {
    if (this.state.signedIn === true) {
      if (this.state.showExpenseForm === false) {
        if (e.keyCode === 65) { // a
          this.onExpenseNew()
        }
      } else {
        if (e.keyCode === 27) { // escape
          this.handleExpenseCancel()
        }
      }
    }
  }

  signedInChanged = (signedIn) => {
    this.setState({ signedIn: signedIn });
    if (this.state.signedIn) {
      this.load();
    }
  }

  handleExpenseSubmit = () => {
    this.setState({ processing: true, showExpenseForm: false });
    const submitAction = (this.state.expense.id
      ? this.update
      : this.append).bind(this);
    submitAction(this.state.expense).then(
      response => {
        this.snackbar.show({
          message: `Expense ${this.state.expense.id ? "updated" : "added"}!`
        });
        this.load();
      },
      response => {
        console.error("Something went wrong");
        console.error(response);
        this.setState({ loading: false });
      }
    );
  }

  handleExpenseChange = (attribute, value) => {
    this.setState({
      expense: Object.assign({}, this.state.expense, { [attribute]: value })
    });
  }

  handleExpenseDelete = (expense) => {
    this.setState({ processing: true, showExpenseForm: false });
    const expenseRow = expense.id.substring(10);
    window.gapi.client.sheets.spreadsheets
      .batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: 0,
                  dimension: "ROWS",
                  startIndex: expenseRow - 1,
                  endIndex: expenseRow
                }
              }
            }
          ]
        }
      })
      .then(
        response => {
          this.snackbar.show({ message: "Expense deleted!" });
          this.load();
        },
        response => {
          console.error("Something went wrong");
          console.error(response);
          this.setState({ loading: false });
        }
      );
  }


  handleExpenseSelect = (expense) => {
    this.setState({ expense: expense, showExpenseForm: true });
  }

  handleExpenseCancel = () => {
    this.setState({ showExpenseForm: false });
  }

  onExpenseNew() {
    const now = new Date();
    this.setState({
      showExpenseForm: true,
      expense: {
        amount: "",
        description: "",
        date: `${now.getFullYear()}-${now.getMonth() < 9
          ? "0" + (now.getMonth() + 1)
          : now.getMonth() + 1}-${now.getDate() < 10
          ? "0" + now.getDate()
          : now.getDate()}`,
        category: this.state.categories[0],
        account: this.state.accounts[0]
      }
    });
  }

  parseExpense(value, index) {
    return {
      id: `Expenses!A${index + 2}`,
      date: value[0],
      description: value[1],
      category: value[3],
      amount: value[4].replace(",", ""),
      account: value[2]
    };
  }

  formatExpense(expense) {
    return [
      `=DATE(${expense.date.substr(0, 4)}, ${expense.date.substr(
        5,
        2
      )}, ${expense.date.substr(-2)})`,
      expense.description,
      expense.account,
      expense.category,
      expense.amount
    ];
  }

  append(expense) {
    return window.gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: "Expenses!A1",
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      values: [this.formatExpense(expense)]
    });
  }

  update(expense) {
    return window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: expense.id,
      valueInputOption: "USER_ENTERED",
      values: [this.formatExpense(expense)]
    });
  }

  load() { //To get data from Google Sheets
    window.gapi.client.sheets.spreadsheets.values
      .batchGet({
        spreadsheetId: this.spreadsheetId,
        ranges: [
          "Data!A2:A50", //Accounts in Data sheet
          "Data!E2:E50", //Categories in Data sheet
          "Expenses!A2:F", //Expenses sheet
          "Current!H1", //Total in Current sheet
          "Previous!H1", //Total in Previous sheet
          "Data!B3", //added Savings value in Data sheet
          "Data!C3", //added Initial savings account value in Data sheet
          "Data!C2", //added Initial chequing account value in Data sheet
          "Data!B2" //added Current chequing balance value in Data sheet
        ]
      })
      .then(response => {
        const accounts = response.result.valueRanges[0].values.map(
          items => items[0]
        );
        const categories = response.result.valueRanges[1].values.map(
          items => items[0]
        );
        this.setState({
          accounts: accounts,
          categories: categories,
          expenses: (response.result.valueRanges[2].values || [])
            .map(this.parseExpense)
            .reverse()
            .slice(0, 30),
          processing: false,
          currentMonth: response.result.valueRanges[3].values[0][0],
          previousMonth: response.result.valueRanges[4].values[0][0],
          valueData: response.result.valueRanges[5].values[0][0], //added
          initialsavingsData:response.result.valueRanges[6].values[0][0], //added
          initialchequingData:response.result.valueRanges[7].values[0][0], //added
          valueChequing:response.result.valueRanges[8].values[0][0] //added
         
        });
      });
  }

  render() {
    return (
      <div>
        <header className="mdc-toolbar mdc-toolbar--fixed">
          <div className="mdc-toolbar__row">
            <section className="mdc-toolbar__section mdc-toolbar__section--align-start">
              <span className="mdc-toolbar__title">zhaCing</span>
            </section>
            <section
              className="mdc-toolbar__section mdc-toolbar__section--align-end"
              role="toolbar"
            >
              {this.state.signedIn === false &&
                <a
                  className="material-icons mdc-toolbar__icon"
                  aria-label="Sign in"
                  alt="Sign in"
                  onClick={e => {
                    e.preventDefault();
                    window.gapi.auth2.getAuthInstance().signIn();
                  }}
                >
                  perm_identity
                </a>}
              {this.state.signedIn &&
                <a
                  className="material-icons mdc-toolbar__icon"
                  aria-label="Sign out"
                  alt="Sign out"
                  onClick={e => {
                    e.preventDefault();
                    window.gapi.auth2.getAuthInstance().signOut();
                  }}
                >
                  exit_to_app
                </a>}
            </section>
          </div>
        </header>
        <div className="toolbar-adjusted-content">
          {this.state.signedIn === undefined && <LoadingBar />}
          {this.state.signedIn === false &&
            <div className="center">
              <button
                className="mdc-button sign-in"
                aria-label="Sign in"
                onClick={() => {
                  window.gapi.auth2.getAuthInstance().signIn();
                }}
              >
                Sign In
              </button>
            </div>}
          {this.state.signedIn && this.renderBody()}
        </div>
        <div
          ref={el => {
            if (el) {
              this.snackbar = new MDCSnackbar(el);
            }
          }}
          className="mdc-snackbar"
          aria-live="assertive"
          aria-atomic="true"
          aria-hidden="true"
        >
          <div className="mdc-snackbar__text" />
          <div className="mdc-snackbar__action-wrapper">
            <button
              type="button"
              className="mdc-button mdc-snackbar__action-button"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    );
  }

  renderBody() {
    if (this.state.processing) return <LoadingBar />;
    else
      return (
        <div className="content">
          {this.renderExpenses()}
        </div>
      );
  }

  renderExpenses() {
    if (this.state.showExpenseForm)
      return (
        <ExpenseForm
          categories={this.state.categories}
          accounts={this.state.accounts}
          expense={this.state.expense}
          onSubmit={this.handleExpenseSubmit}
          onCancel={this.handleExpenseCancel}
          onDelete={this.handleExpenseDelete}
          onChange={this.handleExpenseChange}
        />
      );
    else
      return (
        <div>
          <div className="BOX">
            <div className="mdc-box0">
              <section className="initialvalue-text">Initial savings:</section>
              <section className="initialvalue-data">{this.state.initialsavingsData}</section>
            </div>
            <div className="mdc-box0_1">
              <section className="initialvalue-text">Initial chequing:</section>
              <section className="initialvalue-data">{this.state.initialchequingData}</section>
            </div>
            <div className="mdc-box1">
              <section className="thismonth-text">Spent this month:</section>
              <section className="thismonth-data">{this.state.currentMonth}</section> 
            </div>
            <div className="mdc-box2">
              <section className="previousmonth-text">Spent last month:</section>
              <section className="previousmonth-data">{this.state.previousMonth}</section>
            </div>
            <div className="mdc-box3">
              <section className="accbalance-text">Account balance:</section>        
              <section className="savingsbalance-text">Savings acc:{"\n"}{this.state.valueData}</section>
              <section className="chequingbalance-text">Chequing acc:{"\n"}{this.state.valueChequing}</section>
            </div>
                        
          </div>

              <button 
                onClick={this.openWin}
                className="mdc-fab-1 button-sheet material-icons"
                aria-label="Spreadsheet" 
                >
                <span className="mdc-fab-1 button-sheet__icons">
                  <SiGooglesheets
                  color='white'
                  size='2rem'
                  style={{
                    verticalAlign:'middle',
                    backgroundColor:'none',
                    position:'fixed',
                    top:'20%',
                    right:'0%'
                    


                  }}
                  ></SiGooglesheets></span>    
              </button>


          <ExpenseList
            expenses={this.state.expenses}
            onSelect={this.handleExpenseSelect}
          />
          <button
            onClick={() => this.onExpenseNew()}
            className="mdc-fab app-fab--absolute material-icons"
            aria-label="Add expense"
          >
            <span className="mdc-fab__icon">add</span>
          </button>
          
        </div>
      );
  }
}

export default App;
