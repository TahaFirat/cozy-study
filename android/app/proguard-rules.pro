# Capacitor ProGuard Rules
-keep class com.getcapacitor.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep public class * extends com.getcapacitor.PluginMethod { *; }
-keep class com.getcapacitor.community.** { *; }
-keepattributes *Annotation*
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-dontwarn com.getcapacitor.**
-dontwarn org.apache.cordova.**

# Google Play Console DEX Optimization & Class Repackaging
-repackageclasses ''
-allowaccessmodification

