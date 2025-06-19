import {View, Text, StyleSheet} from "react-native";

export default function Scanner(){
    return(
        <View style={styles.container}>
            <Text>Scenner Screen</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 25
    }
});