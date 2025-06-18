import {View, Text, StyleSheet} from "react-native";

export default function Galerie(){
    return(
        <View style={styles.container}>
            <Text>Galerie Screen</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 25
    }
});