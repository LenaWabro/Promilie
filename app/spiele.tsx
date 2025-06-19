import {View, Text, StyleSheet} from "react-native";

export default function Spiele(){
    return(
        <View style={styles.container}>
            <Text>Spiele Screen</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 25
    }
});