import React, { useEffect, useState } from 'react';
import './App.css';
import Amplify, { API, graphqlOperation} from 'aws-amplify';
import awsConfig from "./aws-exports";
import { ChatMessage } from './models';
import { ListChatMessagesQuery, OnCreateChatMessageSubscription } from './API';
import { createChatMessage } from './graphql/mutations';
import { listChatMessages } from './graphql/queries';
import { Box, Button, Chip, TextField } from '@material-ui/core';
import { onCreateChatMessage } from './graphql/subscriptions';
import {Observable} from 'zen-observable-ts';

Amplify.configure(awsConfig);

type SubscriptionEvent = {value: {data:OnCreateChatMessageSubscription}};

const styles = {
  main: {
    margin: 16,
    height: 504,
    overflow: "auto",
  },
  footer: {
    margin: 16,
    marginLeft: 24,
    height: 64,
  },
  message: {
    margin: 8,
    padding: 8,
    display: "flex",
    width: 300,
  },
  messageInput: {
    width: 300,
    marginRight: 8,
  },
};

function App() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
	const [inputMessage, setInputMessage] = useState<string>("");

	useEffect(() => {
		fetchData();

		const onCreate = API.graphql(graphqlOperation(onCreateChatMessage)) as Observable<object>;

		onCreate.subscribe({
			next: ({value: {data}}: SubscriptionEvent) => {
				// 更新されたデータをリストに追加
				const newMessage: ChatMessage = data.onCreateChatMessage!;
				setChatMessages((prevMessages) => sortMessage([...prevMessages, newMessage])
				);
			},
		});
	},[]);

	async function fetchData() {
		const items = await API.graphql(graphqlOperation(listChatMessages));
		if("data" in items && items.data) {
			const messages = items.data as ListChatMessagesQuery;
			setChatMessages(
				sortMessage(messages.listChatMessages?.items as ChatMessage[])
			)
		}
	}

	async function saveData() {
		const model = new ChatMessage({
			message: inputMessage,
		});
		await API.graphql(graphqlOperation(createChatMessage, {
			input: model,
		}));
		setInputMessage("");
	}

	function sortMessage(messages: ChatMessage[]){
		return [...messages].sort(
			(a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime()
		)
	}

	function onChange(message: string) {
		setInputMessage(message);
	}

	return (
    <>
      <Box style={styles.main}>
        {chatMessages &&
          chatMessages.map((message, index) => {
            return (
              <Chip
                key={index}
                label={message.message}
                color="primary"
                style={styles.message}
              />
            );
          })}
      </Box>
      <Box style={styles.footer}>
        <TextField
          variant="outlined"
          type="text"
          color="primary"
          size="small"
          value={inputMessage}
          style={styles.messageInput}
          onChange={(e) => onChange(e.target.value)}
          placeholder="メッセージを入力"
        />
        <Button variant="contained" color="default" onClick={() => saveData()}>
          投稿
        </Button>
      </Box>
    </>
  );
}

export default App;
