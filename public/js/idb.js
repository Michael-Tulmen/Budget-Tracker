const { getDefaultFlags } = require("mysql/lib/ConnectionConfig");

//var for db connection
let db;
//establish a connection to IndexedDB database called 'budget_tracker' and set it to version 1
const request = indexedDB.open("budget_tracker", 1);
// this event will emit if the database version changes
request.onupgradeneeded = function (event) {
  //save a reference to the database
  const db = event.target.result;
  //create an object store (table) called 'new_transaction', set it to have an auto incrementing primary key
  db.createObjectStore("new_transaction", { autoIncrement: true });
};

// upon a successful
request.onsuccess = function (event) {
  //when db is successfully created with its object store (from onupgradeneeded event above) or simply established a connection/
  //save reference to db in global variable
  db = event.target.result;

  //check if app is online, if yes run uploadTransaction() function to send all local db data to api
  if (navigator.onLine) {
    //check if we're online every time app opens and upload remnant transaction data
    uploadTransaction();
  }
};

request.onerror = function (event) {
  //log error
  console.log(event.target.errorCode);
};

//This function will be executed if we attempt to submit a new pizza and there's no internet connection
function saveRecord(record) {
  //open a new transaction with the database with read and write permissions
  const transaction = db.transaction(["new_transaction"], "readwrite");

  //access object store for 'new_transaction'
  const transactionObjectStore = transaction.objectStore("new_transaction");

  //add record to the store with add method
  transactionObjectStore.add(record);
}

//open new transaction, read data
function uploadTransaction() {
  //open transaction within database
  const transaction = db.transaction(["new_transaction"], "readwrite");

  //access object store for "new transaction"
  const transactionObjectStore = transaction.objectStore("new_transaction");

  //get all records from store and set to a variable
  const getAll = transactionObjectStore.getAll();

  //upon successful .getAll()
  getDefaultFlags.onsuccess = function () {
    //if there was data in indexedDb's store, send to the api server
    if (getAll.result.length > 0) {
      fetch("/api/transaction/bulk", {
        method: "POST",
        //getAll.result is an array of all of the data we retrieved from the new_transaction object store
        body: JSON.stringify(getAll.result),
        headers: {
          Accepts: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then(() => {
          //open one more transaction
          const transaction = db.transaction(["new_transaction"], "readwrite");
          // access new_transaction object store
          const transactionObjectStore =
            transaction.objectStore("new_transaction");
          //clear items in store
          transactionObjectStore.clear();

          alert("All saved transaction have been submitted, clearing cache...");
        })
        .catch((err) => {
          console.log(err);
        });
    }
  };
}
//list for app coming back online

window.addEventListener("online", uploadTransaction);
