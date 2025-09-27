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
    }
}
```