A BLE transmitter that transmits data (json as binary) from peer to peer util it reaches a peer that has internet…

I transmit packets using BLE GAP
Broadcast
Recieve

2 threads are constantly running and updating data in the masterstate

Lets Walkthrough an example

The JSON that needs to be transmitted

{
“from”: “0xasdhklhadfjlhsafd”,
“to”: “0xfdsafdsfd”,
“data”: “dfadfasdfasdf”,
“value”: “ddsfadhfljashkdfaldkjasdkfjhaksdj”,
}

This is converted to BinaryPaylod

Payload = [101010010100010………101010101001000010100101001]

Lets say the payload is 70 bytes

The limit for BLE broadcast on GAP is 31 bytes

1 packet looks like

Header = 3 bytes

Data = 8 bytes

```
Id:		 	        1 byte (0-255)
Number of chunks: 	1 byte (0-255)
Chunk Index:	    7 bit (0-127)
IsItAnACK		    1 bit (0-1)
Data			    8 bytes (0-255)
```

I broadcast this with (NO_NET_SERVICE_ID, [packet])
This broadcast

—------

There are 2 threads constantly running that update the master state

```json
{
    "packet.id": {
        "ack_mode": false,      // as soon as the first ack is received this is toggled to `true`, is_complete is toggled back to `false`, `number_of_chunks` are reset, and `data` is reset
        "is_complete": false,   // this kept to check if all data packets are recieved
        "number_of_chunks": 10  // total number of possible chunks
        "data": {
            1: "101010010100001001",
            2: "101010010100001001",
            3: "101010010100001001",
            ....
            9: "101010010100001001",
            10: "101010010100001001",
        }
    },
    ……
}
```

—-

The Broadcast thread is constantly looping over each packet.id and broadcasting it if
Is_complete is true
Because if is complete is true that means that it has the entire packet and can broadcast it

—

The Receiver thread keeps listening to all packets
If p.id found in master state
Checks if is_ack with incoming packet’s is_ack
If conflict: obey the is_ack true one
If is_complete then
If does not have internet
ignores the rest of the packet
If has internet
Makes the request waits for response
Then
Update the data, no_of_chunks based on response
Marks is_ack as true for the broadcast thread to pick up
Otherwise fills the packet at the correct place in the data map
If p.id not found in master state
Create entry for pid with
Is_complete false
Is_ack based on the packet
No. of chunks based on packet
Data map entry based on data and index
—-

Now each node is pooling the network with what is knows
Until the packet reaches a node with internet after which it starts broadcasting with is_ack: true
with the new data and nodes prefer that unless it reaches the source which is waiting for it
