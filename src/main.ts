// Node imports.
import path from "path";

// Library imports.
import express, { Express, NextFunction, Request, Response, response } from "express";

// App imports.
import { serverInfo } from "./ServerInfo";
import * as IMAP from "./IMAP";
import * as SMTP from "./SMTP";
import * as Contacts from "./Contacts";
import { IContact } from "./Contacts";
import fs from 'fs';
import https from 'https';
import tls from 'tls'

// const options = {
//   key: fs.readFileSync(path.resolve(__dirname, "../key.pem")),
//   cert: fs.readFileSync(path.resolve(__dirname, "../certificate.pem"))
// }



// Our Express app.
const app: Express = express();


// Handle JSON in request bodies.
app.use(express.json());



// Serve the client.
app.use(express.static(path.join(__dirname, "../client/build")));




//"../client/build/static/index.html"
// Enable CORS so that we can call the API even from anywhere.
app.use(function (inRequest: Request, inResponse: Response, inNext: NextFunction) {
  inResponse.header("Access-Control-Allow-Origin", "*");
  inResponse.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  inResponse.header("Access-Control-Allow-Headers", "Origin,X-Requested-With,Content-Type,Accept");
  inNext();
});



// ---------- RESTful endpoint operations begin. ----------

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
})



// Get list of mailboxes.
app.get("/mailboxes",
  async (inRequest: Request, inResponse: Response) => {
    console.log("GET /mailboxes (1)");
    try {
      const imapWorker: IMAP.Worker = new IMAP.Worker(serverInfo);
      const mailboxes: IMAP.IMailbox[] = await imapWorker.listMailboxes();
      console.log(mailboxes)
      inResponse.json(mailboxes);
    } catch (inError) {
      console.log("GET /mailboxes (1): Error", inError);
      inResponse.send("error");
    }
  }
);


// Get list of messages in a mailbox (does NOT include bodies).
app.get("/mailboxes/:mailbox",
  async (inRequest: Request, inResponse: Response) => {
    console.log("GET /mailboxes (2)", inRequest.params.mailbox);
    try {
      const imapWorker: IMAP.Worker = new IMAP.Worker(serverInfo);
      const messages: IMAP.IMessage[] = await imapWorker.listMessages({
        mailbox: inRequest.params.mailbox
      });
      console.log("GET /mailboxes (2): Ok", messages);
      inResponse.json(messages);
    } catch (inError) {
      console.log("GET /mailboxes (2): Error", inError);
      inResponse.send("error");
    }
  }
);

app.get("/mailboxes/GMAIL/:mailbox",
  async (inRequest: Request, inResponse: Response) => {
    console.log("GET /mailboxes (2)", inRequest.params.mailbox);
    try {
      const imapWorker: IMAP.Worker = new IMAP.Worker(serverInfo);
      const messages: IMAP.IMessage[] = await imapWorker.listMessagesOfGmail(inRequest.params.mailbox);
      console.log("GET /mailboxes (2): Ok", messages);
      inResponse.json(messages);
    } catch (inError) {
      console.log("GET /mailboxes (2): Error", inError);
      inResponse.send("error");
    }
  }
);



// Get a message's plain text body.
app.get("/messages/:mailbox/:id",
  async (inRequest: Request, inResponse: Response) => {
    console.log("GET /messages (3)", inRequest.params.mailbox, inRequest.params.id);
    try {
      const imapWorker: IMAP.Worker = new IMAP.Worker(serverInfo);
      const messageBody: string = await imapWorker.getMessageBody({
        mailbox: inRequest.params.mailbox,
        id: parseInt(inRequest.params.id, 10)
      });
      inResponse.setHeader('Content-Type', 'text/html');
      inResponse.send(messageBody);
    } catch (inError) {
      console.log("GET /messages (3): Error", inError);
      inResponse.send("error");
    }
  }
);


// Delete a message.
app.delete("/messages/:mailbox/:id",
  async (inRequest: Request, inResponse: Response) => {
    console.log("DELETE /messages");
    try {
      const imapWorker: IMAP.Worker = new IMAP.Worker(serverInfo);
      await imapWorker.deleteMessage({
        mailbox: inRequest.params.mailbox,
        id: parseInt(inRequest.params.id, 10)
      });
      console.log("DELETE /messages: Ok");
      inResponse.send("ok");
    } catch (inError) {
      console.log("DELETE /messages: Error", inError);
      inResponse.send("error");
    }
  }
);


// Send a message.
app.post("/messages",
  async (inRequest: Request, inResponse: Response) => {
    console.log("POST /messages", inRequest.body);
    try {
      const smtpWorker: SMTP.Worker = new SMTP.Worker(serverInfo);
      await smtpWorker.sendMessage(inRequest.body);
      console.log("POST /messages: Ok");
      inResponse.send("ok");
    } catch (inError) {
      console.log("POST /messages: Error", inError);
      inResponse.send("error");
    }
  }
);


// List contacts.
app.get("/contacts",
  async (inRequest: Request, inResponse: Response) => {
    console.log("GET /contacts");
    try {
      const contactsWorker: Contacts.Worker = new Contacts.Worker();
      const contacts: IContact[] = await contactsWorker.listContacts();
      console.log("GET /contacts: Ok", contacts);
      inResponse.json(contacts);
    } catch (inError) {
      console.log("GET /contacts: Error", inError);
      inResponse.send("error");
    }
  }
);


// Add a contact.
app.post("/contacts",
  async (inRequest: Request, inResponse: Response) => {
    console.log("POST /contacts", inRequest.body);
    try {
      const contactsWorker: Contacts.Worker = new Contacts.Worker();
      const contact: IContact = await contactsWorker.addContact(inRequest.body);
      console.log("POST /contacts: Ok", contact);
      inResponse.json(contact);
    } catch (inError) {
      console.log("POST /contacts: Error", inError);
      inResponse.send("error");
    }
  }
);


// Delete a contact.
app.delete("/contacts/:id",
  async (inRequest: Request, inResponse: Response) => {
    console.log("DELETE /contacts", inRequest.body);
    try {
      const contactsWorker: Contacts.Worker = new Contacts.Worker();
      await contactsWorker.deleteContact(inRequest.params.id);
      console.log("Contact deleted");
      inResponse.send("ok");
    } catch (inError) {
      console.log(inError);
      inResponse.send("error");
    }
  }
);

// TEST ROUTE  *****************************************************

app.get('/selectedInbox',
  async (inRequest: Request, inResponse: Response) => {
    console.log("selectedInbox", inRequest.body);

    try{
      const imapWorker: IMAP.Worker = new IMAP.Worker(serverInfo);
      const response = await imapWorker.getSelectedMailbox()
      inResponse.send(response);
    } catch(error) {
        inResponse.send(error);
    }
  }
)

app.get('/selectedInboxMessageBody/:id',
  async (inRequest: Request, inResponse: Response) => {
    console.log("selectedInbox", inRequest.body);

    try{
      const imapWorker: IMAP.Worker = new IMAP.Worker(serverInfo);
      const response = await imapWorker.getSelectedMailboxMessageBody(
        parseInt(inRequest.params.id, 10)
      )
      inResponse.setHeader('Content-Type', 'text/html');
      inResponse.send(response);
    } catch(error) {
        inResponse.send(error);
    }
  }
)

// Start app listening.
app.listen(9000, () => {
  console.log("MailBag server open for requests");
});


// https.createServer({
//   key: fs.readFileSync(path.resolve(__dirname, "../key.pem"), 'ascii'),
//   cert: fs.readFileSync(path.resolve(__dirname, "../certificate.pem"), 'ascii')
// }, app).listen(9000, () => {
//   console.log("MailBag server open for requests");
// })
