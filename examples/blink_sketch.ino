void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);
}

void println(char* msg) {
  Serial.write((unsigned char)strlen(msg));
  Serial.print(msg);
}

void loop() {
  while (Serial.available() > 0) {
    int msg = Serial.read();
    if (msg == 1) {
      digitalWrite(LED_BUILTIN, HIGH);
      println("LED  ON");
    } else if (msg == 2) {
      digitalWrite(LED_BUILTIN, LOW);
      println("LED OFF");
    }
  }
}
